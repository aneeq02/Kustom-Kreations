import { Router, Response, Request } from 'express';
import pool from '../db/pool';
import { optionalAuth, AuthRequest } from '../middleware/auth';
import { generateOrderNumber } from '../utils/orderNumber';
import { sendOrderConfirmation } from '../services/email';
import { createPayPalOrder, capturePayPalOrder } from '../services/paypal';
import { priceOrder } from '../services/pricing';

const router = Router();

// Marks a duplicated "double your order" item so the admin analytics can
// report upsell take-rate/revenue. Migrates existing databases.
pool.query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS is_upsell_item BOOLEAN NOT NULL DEFAULT false`)
  .catch(err => console.error('order_items.is_upsell_item migration failed:', err));

// ── Per-layout bulk discounts ───────────────────────────────────────────────
// A "layout" here is 1x1 (single magnet) or an NxN tiled set. Each photo the
// customer uploads is its own product/line item (quantity 1); the discount
// is unlocked once the *count of products sharing a layout* — not the count
// of physical magnets — reaches that layout's admin-configured threshold.

// 'photo-magnet-50mm' -> '1x1' (no suffix = single magnet)
// 'photo-magnet-50mm-3x3' -> '3x3'
function resolveLayoutSlug(productId: string): string {
  const m = (productId as string).match(/-(\d+x\d+)$/);
  return m ? m[1] : '1x1';
}

// Number of physical magnets in one product: '3x3' -> 9, '1x1' -> 1.
// Prices are stored per magnet, so a tiled set costs per-magnet price x this.
function tilesPerProduct(productId: string): number {
  const [r, c] = resolveLayoutSlug(productId).split('x').map(n => parseInt(n, 10));
  return (r > 0 && c > 0) ? r * c : 1;
}

// ── Checkout "double your order" upsell ─────────────────────────────────────
// A one-click duplicate of the customer's whole set, offered at checkout.
// The frontend flags cloned items with isUpsellSet; here we only honour that
// flag — and apply the discount — for items that have a genuine full-price
// twin (same product/image/quantity) elsewhere in the same cart, so the
// discount can't be requested on items that were never actually doubled.
// The discount % itself is admin-configurable (magnet_print_config row
// 'upsell_discount_pct', edited via /admin/products/upsell-discount).
async function loadUpsellDiscountPct(): Promise<number> {
  const result = await pool.query(
    `SELECT value FROM magnet_print_config WHERE key = 'upsell_discount_pct'`,
  );
  const pct = parseFloat(result.rows[0]?.value ?? '25');
  return Number.isFinite(pct) ? pct : 25;
}

function upsellMatchKey(item: { productId: string; imageKey?: string; quantity: number }): string {
  return `${item.productId}::${item.imageKey ?? ''}::${item.quantity}`;
}

function applyUpsellDiscount(
  cartItems: Array<{ productId: string; imageKey?: string; quantity: number; isUpsellSet?: boolean }>,
  enrichedItems: Array<{ itemTotal: number; isUpsellItem?: boolean }>,
  discountPct: number,
): number {
  const originalCounts = new Map<string, number>();
  cartItems.forEach(item => {
    if (item.isUpsellSet) return;
    const key = upsellMatchKey(item);
    originalCounts.set(key, (originalCounts.get(key) ?? 0) + 1);
  });

  cartItems.forEach((item, idx) => {
    if (!item.isUpsellSet) return;
    const key = upsellMatchKey(item);
    const available = originalCounts.get(key) ?? 0;
    if (available <= 0) return; // no matching full-price twin — charge in full
    originalCounts.set(key, available - 1);
    enrichedItems[idx].itemTotal *= 1 - discountPct / 100;
    enrichedItems[idx].isUpsellItem = true; // for order_items.is_upsell_item — powers the admin upsell analytics
  });

  return enrichedItems.reduce((s, i) => s + i.itemTotal, 0);
}

async function loadLayoutDiscounts(): Promise<Map<string, { qty: number | null; pct: number }>> {
  const res = await pool.query('SELECT slug, bulk_discount_qty, bulk_discount_pct FROM tile_layouts');
  const map = new Map<string, { qty: number | null; pct: number }>();
  for (const row of res.rows) {
    map.set(row.slug, {
      qty: row.bulk_discount_qty !== null ? Number(row.bulk_discount_qty) : null,
      pct: parseFloat(row.bulk_discount_pct ?? 0),
    });
  }
  return map;
}

// Returns the discount percentage to apply to each cart item (same order as
// input), based on how many products of that item's layout are in the cart.
function computeLayoutDiscountPcts(
  cartItems: Array<{ productId: string; quantity: number }>,
  layoutDiscounts: Map<string, { qty: number | null; pct: number }>,
): number[] {
  const groupQty = new Map<string, number>();
  for (const item of cartItems) {
    const slug = resolveLayoutSlug(item.productId);
    groupQty.set(slug, (groupQty.get(slug) ?? 0) + item.quantity);
  }
  return cartItems.map(item => {
    const slug = resolveLayoutSlug(item.productId);
    const cfg = layoutDiscounts.get(slug);
    if (!cfg?.qty) return 0;
    return (groupQty.get(slug) ?? 0) >= cfg.qty ? cfg.pct : 0;
  });
}

/**
 * POST /api/checkout/place-order
 * Creates the order directly — no payment processing yet.
 * Orders are created with status 'pending' until payment is integrated.
 */
router.post('/place-order', optionalAuth, async (req: AuthRequest, res: Response) => {
  const {
    shippingAddress,
    shippingMethodId,
    cartItems,
    currency,
    discountCodeId,
    voucherId,
    voucherAmount,
    subtotal,
    discountAmount,
    shippingAmount,
    total,
    guestEmail,
    referralSource,
  } = req.body;

  if (!cartItems?.length) return res.status(400).json({ error: 'Cart is empty' });
  if (!shippingAddress) return res.status(400).json({ error: 'Shipping address required' });

  // Server-side recompute subtotal to prevent tampering
  let computedSubtotal = 0;
  const enrichedItems: any[] = [];

  const layoutDiscounts = await loadLayoutDiscounts();
  const discountPcts = computeLayoutDiscountPcts(cartItems, layoutDiscounts);

  for (let idx = 0; idx < cartItems.length; idx++) {
    const item = cartItems[idx];

    // Slug format: 'photo-magnet-50mm' or 'photo-magnet-50mm-3x3'
    // Extract size in mm to price from the admin-configurable magnet_sizes table
    const sizeMatch = (item.productId as string).match(/(\d+)mm/);
    const sizeMm = sizeMatch ? parseInt(sizeMatch[1]) : null;

    let resolvedProductId: string | null = null;
    let unitPrice: number;

    if (sizeMm) {
      const sizeResult = await pool.query(
        'SELECT * FROM magnet_sizes WHERE size_mm = $1 AND active = TRUE',
        [sizeMm],
      );
      if (!sizeResult.rows[0]) {
        return res.status(400).json({ error: `${sizeMm}mm magnets are not currently available` });
      }
      unitPrice = parseFloat(sizeResult.rows[0].price_per_magnet) * tilesPerProduct(item.productId);

      // Find the matching product record for the FK (strip layout suffix from slug)
      const baseSlug = (item.productId as string).replace(/-\d+x\d+$/, '');
      const pResult = await pool.query('SELECT id FROM products WHERE slug = $1', [baseSlug]);
      resolvedProductId = pResult.rows[0]?.id ?? null;
    } else {
      // Fall back: treat productId as a UUID
      const pResult = await pool.query('SELECT * FROM products WHERE id = $1', [item.productId]);
      const product = pResult.rows[0];
      if (!product) return res.status(400).json({ error: `Unknown product: ${item.productId}` });
      unitPrice = parseFloat(product.base_price_gbp);
      resolvedProductId = product.id;
    }

    const discountPct = discountPcts[idx];
    const itemTotal = unitPrice * item.quantity * (1 - discountPct / 100);
    computedSubtotal += itemTotal;

    // Merge tileConfig into crop_data so print file generator can read it later
    const savedCropData = {
      ...(item.cropData ?? {}),
      rows:   item.tileConfig?.rows   ?? 1,
      cols:   item.tileConfig?.cols   ?? 1,
      sizeMm: item.tileConfig?.magnetSizeMm ?? sizeMm ?? 50,
    };

    enrichedItems.push({
      productId: resolvedProductId,
      productName: item.productName ?? 'Photo Magnet',
      quantity: item.quantity,
      unitPrice,
      discountPct,
      itemTotal,
      imageKey: item.imageKey,
      cropData: savedCropData,
      imageQuality: item.imageQuality,
      imageDpi: item.imageDpi,
    });
  }

  // Checkout upsell — "double your order" duplicate set, admin-set discount
  computedSubtotal = applyUpsellDiscount(cartItems, enrichedItems, await loadUpsellDiscountPct());

  // Promo, voucher, delivery and the £1 minimum — shared with the PayPal routes
  let priced;
  try {
    priced = await priceOrder({ subtotal: computedSubtotal, discountCodeId, voucherId, shippingMethodId });
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }
  const computedDiscountAmount = priced.discount;
  const computedVoucherAmount = priced.voucher;
  const computedShippingAmount = priced.shipping;
  const computedTotal = priced.total;
  const orderNumber = await generateOrderNumber();

  const email = guestEmail
    ?? (req.customerId
      ? (await pool.query('SELECT email FROM customers WHERE id=$1', [req.customerId])).rows[0]?.email
      : null);

  const orderResult = await pool.query(`
    INSERT INTO orders (
      order_number, customer_id, guest_email, status,
      shipping_first_name, shipping_last_name, shipping_line1, shipping_line2,
      shipping_city, shipping_county, shipping_postcode, shipping_country,
      currency, subtotal, discount_amount, shipping_amount, total,
      discount_code_id, voucher_id, voucher_amount_used, shipping_method_id,
      referral_source
    ) VALUES (
      $1, $2, $3, 'pending',
      $4, $5, $6, $7, $8, $9, $10, $11,
      $12, $13, $14, $15, $16,
      $17, $18, $19, $20,
      $21
    ) RETURNING id, order_number
  `, [
    orderNumber,
    req.customerId ?? null,
    guestEmail ?? null,
    shippingAddress.firstName, shippingAddress.lastName,
    shippingAddress.line1, shippingAddress.line2 ?? null,
    shippingAddress.city, shippingAddress.county ?? null,
    shippingAddress.postcode, shippingAddress.country,
    currency,
    computedSubtotal.toFixed(2),
    computedDiscountAmount.toFixed(2),
    computedShippingAmount.toFixed(2),
    computedTotal.toFixed(2),
    discountCodeId ?? null,
    voucherId ?? null,
    computedVoucherAmount.toFixed(2),
    shippingMethodId ?? null,
    req.customerId ? null : (referralSource ?? null),
  ]);

  const order = orderResult.rows[0];

  // Insert line items
  for (const item of enrichedItems) {
    await pool.query(`
      INSERT INTO order_items
        (order_id, product_id, quantity, unit_price, discount_pct, total_price,
         image_key, crop_data, image_quality, image_dpi, is_upsell_item)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `, [
      order.id, item.productId, item.quantity,
      item.unitPrice.toFixed(2), item.discountPct,
      item.itemTotal.toFixed(2),
      item.imageKey, JSON.stringify(item.cropData ?? {}),
      item.imageQuality ?? 'good', item.imageDpi ?? 0,
      item.isUpsellItem ?? false,
    ]);
  }

  // Increment discount code use counter
  if (discountCodeId) {
    await pool.query('UPDATE discount_codes SET uses_count = uses_count + 1 WHERE id=$1', [discountCodeId]);
  }

  // Deduct gift voucher balance
  if (voucherId && computedVoucherAmount > 0) {
    const col = 'remaining_balance_gbp';
    await pool.query(`UPDATE gift_vouchers SET ${col} = ${col} - $1 WHERE id=$2`, [computedVoucherAmount, voucherId]);
  }

  // Send confirmation email (non-fatal if it fails)
  if (email) {
    sendOrderConfirmation({
      id: order.id,
      orderNumber,
      email,
      firstName: shippingAddress.firstName,
      total: computedTotal.toFixed(2),
      currency,
      items: enrichedItems.map(i => ({
        name: i.productName,
        qty: i.quantity,
        price: i.itemTotal.toFixed(2),
      })),
    }).catch(err => console.error('[email] order confirmation failed:', err?.message ?? err));
  }

  res.status(201).json({ orderId: order.id, orderNumber });
});

// ── PayPal payment flow ───────────────────────────────────────────────────────

/**
 * Shared: compute verified cart total from raw cart items.
 * Returns enrichedItems and all computed amounts.
 */
async function computeCart(body: {
  cartItems: any[];
  discountCodeId?: string | null;
  voucherId?: string | null;
  shippingMethodId?: string | null;
}) {
  const { cartItems, discountCodeId, voucherId, shippingMethodId } = body;

  let computedSubtotal = 0;
  const enrichedItems: any[] = [];

  const layoutDiscounts = await loadLayoutDiscounts();
  const discountPcts = computeLayoutDiscountPcts(cartItems, layoutDiscounts);

  for (let idx = 0; idx < cartItems.length; idx++) {
    const item = cartItems[idx];

    const sizeMatch = (item.productId as string).match(/(\d+)mm/);
    const sizeMm = sizeMatch ? parseInt(sizeMatch[1]) : null;
    let resolvedProductId: string | null = null;
    let unitPrice: number;

    if (sizeMm) {
      const sizeResult = await pool.query(
        'SELECT * FROM magnet_sizes WHERE size_mm = $1 AND active = TRUE', [sizeMm],
      );
      if (!sizeResult.rows[0]) throw new Error(`${sizeMm}mm magnets are not available`);
      unitPrice = parseFloat(sizeResult.rows[0].price_per_magnet) * tilesPerProduct(item.productId);
      const baseSlug = (item.productId as string).replace(/-\d+x\d+$/, '');
      const pResult = await pool.query('SELECT id FROM products WHERE slug = $1', [baseSlug]);
      resolvedProductId = pResult.rows[0]?.id ?? null;
    } else {
      const pResult = await pool.query('SELECT * FROM products WHERE id = $1', [item.productId]);
      const product = pResult.rows[0];
      if (!product) throw new Error(`Unknown product: ${item.productId}`);
      unitPrice = parseFloat(product.base_price_gbp);
      resolvedProductId = product.id;
    }

    const discountPct = discountPcts[idx];
    const itemTotal   = unitPrice * item.quantity * (1 - discountPct / 100);
    computedSubtotal += itemTotal;

    const savedCropData = {
      ...(item.cropData ?? {}),
      rows:   item.tileConfig?.rows          ?? 1,
      cols:   item.tileConfig?.cols          ?? 1,
      sizeMm: item.tileConfig?.magnetSizeMm  ?? sizeMm ?? 50,
    };

    enrichedItems.push({
      productId:   resolvedProductId,
      productName: item.productName ?? 'Photo Magnet',
      quantity:    item.quantity,
      unitPrice,
      discountPct,
      itemTotal,
      imageKey:      item.imageKey,
      cropData:      savedCropData,
      imageQuality:  item.imageQuality,
      imageDpi:      item.imageDpi,
    });
  }

  // Checkout upsell — "double your order" duplicate set, admin-set discount
  computedSubtotal = applyUpsellDiscount(cartItems, enrichedItems, await loadUpsellDiscountPct());

  // Promo, voucher, delivery and the £1 minimum — throws a customer-friendly
  // message (surfaced by the routes) if a code/method is no longer valid
  const priced = await priceOrder({ subtotal: computedSubtotal, discountCodeId, voucherId, shippingMethodId });
  const computedDiscountAmount = priced.discount;
  const computedVoucherAmount = priced.voucher;
  const computedShippingAmount = priced.shipping;
  const computedTotal = priced.total;
  const isFreeShipping = priced.isFreeShipping;

  return {
    enrichedItems,
    computedSubtotal,
    computedDiscountAmount,
    computedVoucherAmount,
    computedShippingAmount,
    computedTotal,
    isFreeShipping,
  };
}

/**
 * POST /api/checkout/paypal/create-order
 * Validates the cart server-side, creates a PayPal order with the verified
 * total, and returns the PayPal order ID for the frontend SDK.
 */
router.post('/paypal/create-order', optionalAuth, async (req: AuthRequest, res: Response) => {
  const { cartItems, currency, discountCodeId, voucherId, shippingMethodId } = req.body;
  if (!cartItems?.length) return res.status(400).json({ error: 'Cart is empty' });

  try {
    const { computedTotal } = await computeCart({
      cartItems, discountCodeId, voucherId, shippingMethodId,
    });

    // Use a temporary reference; the real order number is created on capture
    const tempRef = `KK-PENDING-${Date.now()}`;
    const paypalOrderId = await createPayPalOrder(
      computedTotal.toFixed(2),
      currency,
      tempRef,
    );

    res.json({ paypalOrderId, amount: computedTotal.toFixed(2) });
  } catch (err: any) {
    console.error('[PayPal create-order]', err);
    res.status(500).json({ error: err.message ?? 'Failed to create PayPal order' });
  }
});

/**
 * POST /api/checkout/paypal/capture
 * Captures the approved PayPal payment, then creates the DB order.
 * This is the single source of truth — the DB order only exists after
 * a successful PayPal capture.
 */
router.post('/paypal/capture', optionalAuth, async (req: AuthRequest, res: Response) => {
  const {
    paypalOrderId,
    shippingAddress,
    shippingMethodId,
    cartItems,
    currency,
    discountCodeId,
    voucherId,
    guestEmail,
    referralSource,
  } = req.body;

  if (!paypalOrderId)     return res.status(400).json({ error: 'paypalOrderId required' });
  if (!cartItems?.length) return res.status(400).json({ error: 'Cart is empty' });
  if (!shippingAddress)   return res.status(400).json({ error: 'Shipping address required' });

  try {
    // 1. Re-validate the cart to get the authoritative total
    const {
      enrichedItems,
      computedSubtotal,
      computedDiscountAmount,
      computedVoucherAmount,
      computedShippingAmount,
      computedTotal,
    } = await computeCart({ cartItems, discountCodeId, voucherId, shippingMethodId });

    // 2. Capture the PayPal payment
    const capture = await capturePayPalOrder(paypalOrderId);

    if (capture.status !== 'COMPLETED') {
      return res.status(402).json({ error: `Payment not completed — status: ${capture.status}` });
    }

    // 3. Verify the captured amount matches our computed total (tamper check)
    const capturedAmount = parseFloat(
      capture.purchase_units[0]?.payments?.captures?.[0]?.amount?.value ?? '0',
    );
    if (Math.abs(capturedAmount - computedTotal) > 0.01) {
      console.error('[PayPal] Amount mismatch — captured:', capturedAmount, 'expected:', computedTotal);
      // Don't refund automatically in dev, but log and flag
    }

    const paypalCaptureId = capture.purchase_units[0]?.payments?.captures?.[0]?.id;

    // 4. Create the DB order (status = paid, paid_at = now)
    const orderNumber = await generateOrderNumber();

    const email = guestEmail
      ?? (req.customerId
        ? (await pool.query('SELECT email FROM customers WHERE id=$1', [req.customerId])).rows[0]?.email
        : null)
      ?? capture.payer?.email_address;

    const orderResult = await pool.query(`
      INSERT INTO orders (
        order_number, customer_id, guest_email, status,
        shipping_first_name, shipping_last_name, shipping_line1, shipping_line2,
        shipping_city, shipping_county, shipping_postcode, shipping_country,
        currency, subtotal, discount_amount, shipping_amount, total,
        discount_code_id, voucher_id, voucher_amount_used, shipping_method_id,
        payment_intent_id, referral_source, paid_at
      ) VALUES (
        $1, $2, $3, 'paid',
        $4, $5, $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16,
        $17, $18, $19, $20,
        $21, $22, NOW()
      ) RETURNING id, order_number
    `, [
      orderNumber,
      req.customerId ?? null,
      guestEmail ?? null,
      shippingAddress.firstName, shippingAddress.lastName,
      shippingAddress.line1, shippingAddress.line2 ?? null,
      shippingAddress.city, shippingAddress.county ?? null,
      shippingAddress.postcode, shippingAddress.country,
      currency,
      computedSubtotal.toFixed(2),
      computedDiscountAmount.toFixed(2),
      computedShippingAmount.toFixed(2),
      computedTotal.toFixed(2),
      discountCodeId ?? null,
      voucherId ?? null,
      computedVoucherAmount.toFixed(2),
      shippingMethodId ?? null,
      paypalCaptureId ?? paypalOrderId,
      req.customerId ? null : (referralSource ?? null),
    ]);

    const order = orderResult.rows[0];

    // 5. Insert line items
    for (const item of enrichedItems) {
      await pool.query(`
        INSERT INTO order_items
          (order_id, product_id, quantity, unit_price, discount_pct, total_price,
           image_key, crop_data, image_quality, image_dpi, is_upsell_item)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `, [
        order.id, item.productId, item.quantity,
        item.unitPrice.toFixed(2), item.discountPct,
        item.itemTotal.toFixed(2),
        item.imageKey, JSON.stringify(item.cropData ?? {}),
        item.imageQuality ?? 'good', item.imageDpi ?? 0,
        item.isUpsellItem ?? false,
      ]);
    }

    // 6. Increment discount code use counter
    if (discountCodeId) {
      await pool.query('UPDATE discount_codes SET uses_count = uses_count + 1 WHERE id=$1', [discountCodeId]);
    }

    // 7. Deduct voucher balance
    if (voucherId && computedVoucherAmount > 0) {
      const col = 'remaining_balance_gbp';
      await pool.query(`UPDATE gift_vouchers SET ${col} = ${col} - $1 WHERE id=$2`, [computedVoucherAmount, voucherId]);
    }

    // 8. Send confirmation email
    if (email) {
      sendOrderConfirmation({
        id: order.id, orderNumber, email,
        firstName: shippingAddress.firstName,
        total: computedTotal.toFixed(2), currency,
        items: enrichedItems.map(i => ({ name: i.productName, qty: i.quantity, price: i.itemTotal.toFixed(2) })),
      }).catch(err => console.error('[email] order confirmation failed:', err?.message ?? err));
    }

    res.status(201).json({ orderId: order.id, orderNumber });
  } catch (err: any) {
    console.error('[PayPal capture]', err);
    res.status(500).json({ error: err.message ?? 'Payment capture failed' });
  }
});

// ── Dev-only payment bypass ───────────────────────────────────────────────────
// Enabled only when PAYPAL_DEV_BYPASS=true AND NODE_ENV !== 'production'.
// Lets you test the full checkout→confirmation→admin flow without PayPal credentials.
if (process.env.PAYPAL_DEV_BYPASS === 'true' && process.env.NODE_ENV !== 'production') {
  router.post('/dev-pay', optionalAuth, async (req: AuthRequest, res: Response) => {
    const { shippingAddress, shippingMethodId, cartItems, currency, discountCodeId, voucherId, guestEmail, referralSource } = req.body;

    if (!cartItems?.length) return res.status(400).json({ error: 'Cart is empty' });
    if (!shippingAddress)   return res.status(400).json({ error: 'Shipping address required' });

    try {
      const {
        enrichedItems,
        computedSubtotal,
        computedDiscountAmount,
        computedVoucherAmount,
        computedShippingAmount,
        computedTotal,
      } = await computeCart({ cartItems, discountCodeId, voucherId, shippingMethodId });

      const orderNumber = await generateOrderNumber();

      const email = guestEmail
        ?? (req.customerId
          ? (await pool.query('SELECT email FROM customers WHERE id=$1', [req.customerId])).rows[0]?.email
          : null);

      const orderResult = await pool.query(`
        INSERT INTO orders (
          order_number, customer_id, guest_email, status,
          shipping_first_name, shipping_last_name, shipping_line1, shipping_line2,
          shipping_city, shipping_county, shipping_postcode, shipping_country,
          currency, subtotal, discount_amount, shipping_amount, total,
          discount_code_id, voucher_id, voucher_amount_used, shipping_method_id,
          payment_intent_id, referral_source, paid_at
        ) VALUES (
          $1, $2, $3, 'paid',
          $4, $5, $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16,
          $17, $18, $19, $20,
          'DEV-BYPASS', $21, NOW()
        ) RETURNING id, order_number
      `, [
        orderNumber, req.customerId ?? null, guestEmail ?? null,
        shippingAddress.firstName, shippingAddress.lastName,
        shippingAddress.line1, shippingAddress.line2 ?? null,
        shippingAddress.city, shippingAddress.county ?? null,
        shippingAddress.postcode, shippingAddress.country,
        currency,
        computedSubtotal.toFixed(2), computedDiscountAmount.toFixed(2),
        computedShippingAmount.toFixed(2), computedTotal.toFixed(2),
        discountCodeId ?? null, voucherId ?? null, computedVoucherAmount.toFixed(2),
        shippingMethodId ?? null,
        req.customerId ? null : (referralSource ?? null),
      ]);

      const order = orderResult.rows[0];

      for (const item of enrichedItems) {
        await pool.query(`
          INSERT INTO order_items
            (order_id, product_id, quantity, unit_price, discount_pct, total_price,
             image_key, crop_data, image_quality, image_dpi, is_upsell_item)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        `, [
          order.id, item.productId, item.quantity,
          item.unitPrice.toFixed(2), item.discountPct, item.itemTotal.toFixed(2),
          item.imageKey, JSON.stringify(item.cropData ?? {}),
          item.imageQuality ?? 'good', item.imageDpi ?? 0,
          item.isUpsellItem ?? false,
        ]);
      }

      if (email) {
        sendOrderConfirmation({
          id: order.id, orderNumber, email,
          firstName: shippingAddress.firstName,
          total: computedTotal.toFixed(2), currency,
          items: enrichedItems.map(i => ({ name: i.productName, qty: i.quantity, price: i.itemTotal.toFixed(2) })),
        }).catch(err => console.error('[email] order confirmation failed:', err?.message ?? err));
      }

      res.status(201).json({ orderId: order.id, orderNumber });
    } catch (err: any) {
      console.error('[dev-pay]', err);
      res.status(500).json({ error: err.message ?? 'Dev payment failed' });
    }
  });
}

export default router;
