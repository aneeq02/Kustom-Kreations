import pool from '../db/pool';

// Shop policy: no order may total less than £1. PayPal itself has no minimum,
// but its fixed per-sale fee (~30p) would make smaller orders loss-making.
export const MIN_ORDER_TOTAL = 1.0;

// Charm pricing for the final order total: round down to the nearest 50p
// strictly below the raw amount, e.g. 18.74 -> 18.50, 20.00 -> 19.50.
// Must match the frontend's roundToCharmPrice exactly.
export function roundToCharmPrice(amount: number): number {
  const pence = Math.round(amount * 100);
  const flooredPence = Math.max(0, Math.floor((pence - 1) / 50) * 50);
  return flooredPence / 100;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface DiscountRow {
  id: string;
  code: string;
  type: 'percent' | 'fixed_gbp' | 'fixed_eur' | 'free_shipping';
  value: string | null;
  min_order_gbp: string | null;
  max_uses: number | null;
  uses_count: number;
  valid_from: Date | null;
  valid_until: Date | null;
  active: boolean;
  description: string | null;
}

/**
 * Checks a promo code can be used on a basket of `subtotal` (goods, after
 * bulk discounts). Throws a customer-friendly Error when it can't.
 */
export function assertDiscountUsable(dc: DiscountRow | undefined, subtotal: number): asserts dc is DiscountRow {
  const now = new Date();
  if (!dc || !dc.active
    || (dc.valid_from && new Date(dc.valid_from) > now)
    || (dc.valid_until && new Date(dc.valid_until) < now)
    || (dc.max_uses !== null && dc.uses_count >= dc.max_uses)) {
    throw new Error('This promo code is invalid or has expired');
  }
  if (dc.min_order_gbp && subtotal < parseFloat(dc.min_order_gbp)) {
    throw new Error(`Minimum order of £${parseFloat(dc.min_order_gbp).toFixed(2)} required for this code`);
  }
}

/**
 * What a promo code takes off the ORDER TOTAL (never per item):
 *  - percent:       value% of the goods subtotal
 *  - fixed_gbp:     £value off, capped at the subtotal
 *  - free_shipping: £0 off the goods — delivery is waived instead
 */
export function discountForCode(dc: DiscountRow, subtotal: number) {
  const value = parseFloat(dc.value ?? '0') || 0;
  switch (dc.type) {
    case 'percent':
      return { amount: round2(Math.min(subtotal, (subtotal * value) / 100)), isFreeShipping: false };
    case 'fixed_gbp':
      return { amount: round2(Math.min(subtotal, value)), isFreeShipping: false };
    case 'free_shipping':
      return { amount: 0, isFreeShipping: true };
    default:
      return { amount: 0, isFreeShipping: false };
  }
}

/**
 * Keeps the payable total at or above the £1 PayPal minimum by giving back
 * part of the discount — voucher first (so the customer keeps that balance),
 * then the promo.
 */
export function applyMinimumTotal(subtotal: number, shipping: number, discount: number, voucher: number) {
  let raw = subtotal - discount - voucher + shipping;
  if (raw < MIN_ORDER_TOTAL) {
    let shortfall = MIN_ORDER_TOTAL - raw;
    const fromVoucher = Math.min(voucher, shortfall);
    voucher = round2(voucher - fromVoucher);
    shortfall = round2(shortfall - fromVoucher);
    discount = round2(Math.max(0, discount - shortfall));
    raw = subtotal - discount - voucher + shipping;
  }
  // Charm rounding can only pull it down, so floor it back at the minimum
  const total = Math.max(MIN_ORDER_TOTAL, roundToCharmPrice(raw));
  return { discount, voucher, total };
}

/**
 * The single source of truth for what an order costs, given the goods
 * subtotal (already bulk-discounted). Used by every checkout route.
 */
export async function priceOrder(args: {
  subtotal: number;
  discountCodeId?: string | null;
  voucherId?: string | null;
  shippingMethodId?: string | null;
}) {
  const { subtotal, discountCodeId, voucherId, shippingMethodId } = args;

  // Promo code — applied to the order total
  let discount = 0;
  let isFreeShipping = false;
  if (discountCodeId) {
    const dc = (await pool.query<DiscountRow>('SELECT * FROM discount_codes WHERE id=$1', [discountCodeId])).rows[0];
    assertDiscountUsable(dc, subtotal);
    ({ amount: discount, isFreeShipping } = discountForCode(dc, subtotal));
  }

  // Gift voucher — spends its balance against what's left of the goods total
  let voucher = 0;
  if (voucherId) {
    const v = (await pool.query('SELECT * FROM gift_vouchers WHERE id=$1 AND active=TRUE', [voucherId])).rows[0];
    if (!v) throw new Error('This gift voucher is no longer valid');
    const bal = parseFloat(v.remaining_balance_gbp ?? 0) || 0;
    voucher = round2(Math.min(bal, Math.max(0, subtotal - discount)));
  }

  // Delivery — waived by a free-delivery code, otherwise a method is required
  let shipping = 0;
  if (!isFreeShipping) {
    if (!shippingMethodId) throw new Error('Please choose a delivery method');
    const sm = (await pool.query('SELECT * FROM shipping_methods WHERE id=$1 AND active=TRUE', [shippingMethodId])).rows[0];
    if (!sm) throw new Error('That delivery method is no longer available');
    const freeFrom = sm.free_from_gbp;
    shipping = freeFrom && subtotal >= parseFloat(freeFrom) ? 0 : parseFloat(sm.price_gbp);
  }

  const floored = applyMinimumTotal(subtotal, shipping, discount, voucher);
  return {
    discount: floored.discount,
    voucher: floored.voucher,
    shipping,
    isFreeShipping,
    total: floored.total,
  };
}
