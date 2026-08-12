import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import pool from '../db/pool';
import { getFileUrl, uploadFile } from '../services/storage';

const router = Router();

// ── Admin PIN middleware ───────────────────────────────────────────────────────

function adminAuth(req: Request, res: Response, next: NextFunction) {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) return next(); // no PIN configured → open in dev
  const pin = req.headers['x-admin-pin'] as string | undefined;
  if (!pin || pin !== adminPin) {
    return res.status(401).json({ error: 'Incorrect admin PIN' });
  }
  next();
}

router.use(adminAuth);

// ── Verify PIN (frontend uses this to test the entered PIN) ───────────────────
router.get('/verify', (_req, res) => res.json({ ok: true }));

// ── Dashboard stats ───────────────────────────────────────────────────────────

router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const [ordersRes, revenueRes, customersRes, recentRes, statusRes, todayRes] =
      await Promise.all([
        pool.query(
          `SELECT COUNT(*) AS count FROM orders WHERE status NOT IN ('cancelled')`,
        ),
        pool.query(
          `SELECT COALESCE(SUM(total), 0) AS revenue
           FROM orders
           WHERE status NOT IN ('cancelled','refunded') AND currency = 'GBP'`,
        ),
        pool.query(`SELECT COUNT(*) AS count FROM customers`),
        pool.query(
          `SELECT o.id, o.order_number, o.status, o.total, o.currency,
                  o.shipping_first_name, o.shipping_last_name, o.created_at,
                  COALESCE(c.email, o.guest_email) AS email
           FROM orders o
           LEFT JOIN customers c ON c.id = o.customer_id
           ORDER BY o.created_at DESC
           LIMIT 8`,
        ),
        pool.query(
          `SELECT status, COUNT(*) AS count FROM orders GROUP BY status ORDER BY count DESC`,
        ),
        pool.query(
          `SELECT COUNT(*) AS count, COALESCE(SUM(total), 0) AS revenue
           FROM orders
           WHERE created_at >= NOW() - INTERVAL '24 hours'
             AND status NOT IN ('cancelled','refunded')`,
        ),
      ]);

    res.json({
      totalOrders:     parseInt(ordersRes.rows[0].count),
      revenue:         parseFloat(revenueRes.rows[0].revenue),
      totalCustomers:  parseInt(customersRes.rows[0].count),
      todayOrders:     parseInt(todayRes.rows[0].count),
      todayRevenue:    parseFloat(todayRes.rows[0].revenue),
      recentOrders:    recentRes.rows,
      statusBreakdown: statusRes.rows,
    });
  } catch (err) {
    console.error('Dashboard query failed:', err);
    res.status(503).json({ error: 'Database unavailable', detail: err instanceof Error ? err.message : String(err) });
  }
});

// ── Orders ────────────────────────────────────────────────────────────────────

router.get('/orders', async (req: Request, res: Response) => {
  const page   = parseInt((req.query.page   as string) || '1');
  const limit  = parseInt((req.query.limit  as string) || '20');
  const offset = (page - 1) * limit;
  const search = (req.query.search as string) || '';
  const status = (req.query.status as string) || '';

  const conditions: string[] = [];
  const params: unknown[]    = [];

  if (search) {
    params.push(`%${search}%`);
    const n = params.length;
    conditions.push(
      `(o.order_number ILIKE $${n} OR o.shipping_first_name ILIKE $${n} OR o.shipping_last_name ILIKE $${n} OR COALESCE(c.email, o.guest_email) ILIKE $${n})`,
    );
  }
  if (status && status !== 'all') {
    params.push(status);
    conditions.push(`o.status = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await pool.query(
    `SELECT COUNT(*) AS count
     FROM orders o LEFT JOIN customers c ON c.id = o.customer_id
     ${where}`,
    params,
  );

  params.push(limit, offset);
  const ordersRes = await pool.query(
    `SELECT o.id, o.order_number, o.status, o.total, o.currency,
            o.shipping_first_name, o.shipping_last_name, o.created_at, o.dispatched_at,
            o.referral_source,
            COALESCE(c.email, o.guest_email) AS email,
            COUNT(oi.id) AS item_count
     FROM orders o
     LEFT JOIN customers c  ON c.id  = o.customer_id
     LEFT JOIN order_items oi ON oi.order_id = o.id
     ${where}
     GROUP BY o.id, c.email
     ORDER BY o.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  const total = parseInt(countRes.rows[0].count);
  res.json({
    orders:     ordersRes.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

// Single order detail
router.get('/orders/:id', async (req: Request, res: Response) => {
  const [orderRes, itemsRes] = await Promise.all([
    pool.query(
      `SELECT
         o.id, o.order_number, o.status, o.currency,
         o.subtotal, o.discount_amount,
         o.shipping_amount          AS shipping_cost,
         o.total,
         o.shipping_first_name,
         o.shipping_last_name,
         o.shipping_line1           AS shipping_address_line1,
         o.shipping_line2           AS shipping_address_line2,
         o.shipping_city,
         o.shipping_postcode,
         o.shipping_country,
         o.tracking_number, o.tracking_carrier,
         o.dispatched_at, o.delivered_at, o.notes, o.referral_source, o.created_at,
         (o.customer_id IS NOT NULL) AS is_registered,
         COALESCE(c.email, o.guest_email) AS email,
         c.phone,
         sm.name AS shipping_method_name
       FROM orders o
       LEFT JOIN customers c ON c.id = o.customer_id
       LEFT JOIN shipping_methods sm ON sm.id = o.shipping_method_id
       WHERE o.id = $1`,
      [req.params.id],
    ),
    pool.query(
      `SELECT
         oi.id, oi.quantity, oi.unit_price,
         oi.total_price             AS subtotal,
         oi.image_key,
         oi.print_file_key,
         oi.crop_data,
         oi.image_quality, oi.image_dpi,
         p.name                     AS product_name,
         p.slug                     AS product_slug
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1`,
      [req.params.id],
    ),
  ]);

  if (!orderRes.rows[0]) return res.status(404).json({ error: 'Order not found' });

  const items = itemsRes.rows.map(i => ({
    ...i,
    image_url:      i.image_key && i.image_key !== 'pending' ? getFileUrl(i.image_key) : null,
    print_file_url: i.print_file_key ? getFileUrl(i.print_file_key) : null,
  }));

  res.json({ ...orderRes.rows[0], items });
});

// Update order (status, tracking, notes)
router.patch('/orders/:id', async (req: Request, res: Response) => {
  const { status, trackingNumber, trackingCarrier, notes } = req.body;

  const result = await pool.query(
    `UPDATE orders SET
       status           = COALESCE($2, status),
       tracking_number  = COALESCE($3, tracking_number),
       tracking_carrier = COALESCE($4, tracking_carrier),
       notes            = COALESCE($5, notes),
       paid_at          = CASE WHEN $2 IN ('paid','in_production','dispatched','delivered') AND paid_at IS NULL THEN NOW() ELSE paid_at END,
       dispatched_at    = CASE WHEN $2 = 'dispatched' AND dispatched_at IS NULL THEN NOW() ELSE dispatched_at END,
       delivered_at     = CASE WHEN $2 = 'delivered'  AND delivered_at  IS NULL THEN NOW() ELSE delivered_at  END,
       updated_at       = NOW()
     WHERE id = $1
     RETURNING *`,
    [req.params.id, status ?? null, trackingNumber ?? null, trackingCarrier ?? null, notes ?? null],
  );

  if (!result.rows[0]) return res.status(404).json({ error: 'Order not found' });
  res.json(result.rows[0]);
});

// ── Print file generation ─────────────────────────────────────────────────────

const CANVAS_SIZE = 360;
const TARGET_DPI  = 300;

function mmToPx(mm: number): number {
  return Math.round((mm / 25.4) * TARGET_DPI);
}

async function buildPrintBuffer(
  imageKey: string,
  crop: { x?: number; y?: number; scale?: number; rotation?: number; rows?: number; cols?: number; sizeMm?: number },
): Promise<{ buffer: Buffer; rows: number; cols: number; sizeMm: number }> {
  const uploadsDir = path.resolve(process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads'));
  const filePath   = path.join(uploadsDir, imageKey);

  const rows   = crop.rows   ?? 1;
  const cols   = crop.cols   ?? 1;
  const sizeMm = crop.sizeMm ?? 50;

  const tilePx = mmToPx(sizeMm);
  const outW   = tilePx * cols;
  const outH   = tilePx * rows;

  const meta = await sharp(filePath).metadata();
  const W = meta.width  ?? 800;
  const H = meta.height ?? 800;

  const x     = crop.x     ?? CANVAS_SIZE / 2;
  const y     = crop.y     ?? CANVAS_SIZE / 2;
  const scale = crop.scale ?? 1;

  // Crop region in original-image pixel coordinates
  // The Konva canvas centres the image at (x, y); offsetX/Y = displayW/2, displayH/2
  const cropLeft = Math.max(0, Math.round(W / 2 - x / scale));
  const cropTop  = Math.max(0, Math.round(H / 2 - y / scale));
  const cropW    = Math.min(Math.round(CANVAS_SIZE / scale), W - cropLeft);
  const cropH    = Math.min(Math.round(CANVAS_SIZE / scale), H - cropTop);

  let pipeline = sharp(filePath);
  if (crop.rotation) pipeline = pipeline.rotate(crop.rotation);

  const buffer = await pipeline
    .extract({ left: cropLeft, top: cropTop, width: Math.max(1, cropW), height: Math.max(1, cropH) })
    .resize(outW, outH, { fit: 'fill' })
    .jpeg({ quality: 95 })
    .toBuffer();

  return { buffer, rows, cols, sizeMm };
}

// POST /api/admin/orders/:id/print-files/generate
router.post('/orders/:id/print-files/generate', async (req: Request, res: Response) => {
  const itemsRes = await pool.query(
    `SELECT id, image_key, print_file_key, crop_data
     FROM order_items WHERE order_id = $1`,
    [req.params.id],
  );

  if (!itemsRes.rows.length) {
    return res.status(404).json({ error: 'Order not found or has no items' });
  }

  const uploadsDir = path.resolve(process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads'));
  const results: Array<{ itemId: string; url: string; fileName: string; rows: number; cols: number; sizeMm: number }> = [];

  for (const item of itemsRes.rows) {
    if (!item.image_key || item.image_key === 'pending') continue;

    const filePath = path.join(uploadsDir, item.image_key);
    if (!fs.existsSync(filePath)) continue;

    const crop = (typeof item.crop_data === 'string'
      ? JSON.parse(item.crop_data)
      : item.crop_data) ?? {};

    try {
      const { buffer, rows, cols, sizeMm } = await buildPrintBuffer(item.image_key, crop);

      const printKey = await uploadFile(buffer, 'image/jpeg', 'print-files');

      await pool.query(
        'UPDATE order_items SET print_file_key = $2 WHERE id = $1',
        [item.id, printKey],
      );

      const gridLabel = rows === 1 && cols === 1 ? 'single' : `${rows}x${cols}`;
      results.push({
        itemId:   item.id,
        url:      getFileUrl(printKey),
        fileName: `print_${sizeMm}mm_${gridLabel}.jpg`,
        rows, cols, sizeMm,
      });
    } catch (err) {
      console.error('Print file generation failed for item', item.id, err);
    }
  }

  res.json({ files: results });
});

// ── Customers ─────────────────────────────────────────────────────────────────

router.get('/customers', async (req: Request, res: Response) => {
  const page   = parseInt((req.query.page  as string) || '1');
  const limit  = parseInt((req.query.limit as string) || '25');
  const offset = (page - 1) * limit;
  const search = (req.query.search as string) || '';

  const params: unknown[] = [];
  let where = '';
  if (search) {
    params.push(`%${search}%`);
    where = `WHERE c.email ILIKE $1 OR c.first_name ILIKE $1 OR c.last_name ILIKE $1`;
  }

  const countRes = await pool.query(
    `SELECT COUNT(*) AS count FROM customers c ${where}`,
    params,
  );

  params.push(limit, offset);
  const cusRes = await pool.query(
    `SELECT c.id, c.email, c.first_name, c.last_name, c.phone, c.created_at,
            COUNT(o.id)               AS order_count,
            COALESCE(SUM(o.total), 0) AS total_spent
     FROM customers c
     LEFT JOIN orders o ON o.customer_id = c.id AND o.status NOT IN ('cancelled','refunded')
     ${where}
     GROUP BY c.id
     ORDER BY c.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  const total = parseInt(countRes.rows[0].count);
  res.json({
    customers:  cusRes.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

// ── Discount codes ────────────────────────────────────────────────────────────

const TYPE_MAP: Record<string, string> = {
  percentage:    'percent',
  fixed:         'fixed_gbp',
  free_shipping: 'free_shipping',
  percent:       'percent',
  fixed_gbp:     'fixed_gbp',
};

router.get('/discounts', async (_req, res) => {
  const result = await pool.query(
    `SELECT
       id, code, type, value,
       min_order_gbp  AS min_order_amount,
       max_uses,
       uses_count     AS used_count,
       active, valid_until AS expires_at, created_at
     FROM discount_codes ORDER BY created_at DESC`,
  );
  res.json(result.rows);
});

router.post('/discounts', async (req: Request, res: Response) => {
  const { code, type, value, min_order_amount, max_uses, expires_at } = req.body;

  if (!code || !type) return res.status(400).json({ error: 'Code and type are required' });
  const dbType = TYPE_MAP[type];
  if (!dbType) {
    return res.status(400).json({ error: 'Invalid discount type' });
  }

  const result = await pool.query(
    `INSERT INTO discount_codes
       (code, type, value, min_order_gbp, max_uses, valid_until, active)
     VALUES ($1,$2,$3,$4,$5,$6,TRUE)
     RETURNING
       id, code, type, value,
       min_order_gbp AS min_order_amount,
       max_uses, uses_count AS used_count,
       active, valid_until AS expires_at, created_at`,
    [
      code.toUpperCase().trim(),
      dbType,
      value || null,
      min_order_amount || null,
      max_uses || null,
      expires_at || null,
    ],
  );

  res.status(201).json(result.rows[0]);
});

router.patch('/discounts/:id', async (req: Request, res: Response) => {
  const { active } = req.body;
  const result = await pool.query(
    `UPDATE discount_codes SET active = $2 WHERE id = $1
     RETURNING id, code, type, value, min_order_gbp AS min_order_amount,
               max_uses, uses_count AS used_count, active, valid_until AS expires_at, created_at`,
    [req.params.id, active],
  );
  res.json(result.rows[0]);
});

router.delete('/discounts/:id', async (req: Request, res: Response) => {
  await pool.query(`DELETE FROM discount_codes WHERE id = $1`, [req.params.id]);
  res.json({ ok: true });
});

// ── Gift vouchers ─────────────────────────────────────────────────────────────

router.get('/vouchers', async (_req, res) => {
  const result = await pool.query(
    `SELECT
       id, code,
       initial_balance_gbp   AS original_amount,
       remaining_balance_gbp AS remaining_amount,
       active, valid_until   AS expires_at, created_at
     FROM gift_vouchers ORDER BY created_at DESC`,
  );
  res.json(result.rows);
});

router.patch('/vouchers/:id', async (req: Request, res: Response) => {
  const result = await pool.query(
    `UPDATE gift_vouchers SET active = $2 WHERE id = $1
     RETURNING id, code, initial_balance_gbp AS original_amount,
               remaining_balance_gbp AS remaining_amount,
               active, valid_until AS expires_at, created_at`,
    [req.params.id, req.body.active],
  );
  res.json(result.rows[0]);
});

// ── Shipping ──────────────────────────────────────────────────────────────────

const SHIPPING_SELECT = `
  sm.id, sm.zone_id, sm.name,
  sm.description                AS carrier,
  sm.price_gbp                  AS price,
  sm.estimated_days_min,
  sm.estimated_days_max,
  sm.free_from_gbp              AS free_over_amount,
  sm.active,
  sz.name                       AS zone_name
`;

router.get('/shipping', async (_req, res) => {
  const [zonesRes, methodsRes] = await Promise.all([
    pool.query(`SELECT id, name, countries AS country_codes FROM shipping_zones ORDER BY name`),
    pool.query(
      `SELECT ${SHIPPING_SELECT}
       FROM shipping_methods sm
       JOIN shipping_zones sz ON sz.id = sm.zone_id
       ORDER BY sz.name, sm.sort_order`,
    ),
  ]);
  res.json({ zones: zonesRes.rows, methods: methodsRes.rows });
});

router.post('/shipping/methods', async (req: Request, res: Response) => {
  const { zone_id, name, carrier, price, estimated_days_min, estimated_days_max, free_over_amount } = req.body;

  if (!zone_id || !name) return res.status(400).json({ error: 'Zone and name required' });

  const inserted = await pool.query(
    `INSERT INTO shipping_methods
       (zone_id, name, description, price_gbp, estimated_days_min, estimated_days_max, free_from_gbp, active, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE,0)
     RETURNING id`,
    [
      zone_id, name, carrier || null,
      price || 0,
      estimated_days_min || null, estimated_days_max || null,
      free_over_amount || null,
    ],
  );

  const row = await pool.query(
    `SELECT ${SHIPPING_SELECT}
     FROM shipping_methods sm
     JOIN shipping_zones sz ON sz.id = sm.zone_id
     WHERE sm.id = $1`,
    [inserted.rows[0].id],
  );
  res.status(201).json(row.rows[0]);
});

router.patch('/shipping/methods/:id', async (req: Request, res: Response) => {
  const { active, price, free_over_amount } = req.body;
  const freeOver = free_over_amount !== undefined ? (free_over_amount || null) : null;

  await pool.query(
    `UPDATE shipping_methods SET
       price_gbp     = COALESCE($2, price_gbp),
       free_from_gbp = COALESCE($3, free_from_gbp),
       active        = COALESCE($4, active)
     WHERE id = $1`,
    [req.params.id, price ?? null, freeOver, active ?? null],
  );

  const row = await pool.query(
    `SELECT ${SHIPPING_SELECT}
     FROM shipping_methods sm
     JOIN shipping_zones sz ON sz.id = sm.zone_id
     WHERE sm.id = $1`,
    [req.params.id],
  );
  res.json(row.rows[0]);
});

router.delete('/shipping/methods/:id', async (req: Request, res: Response) => {
  await pool.query(`DELETE FROM shipping_methods WHERE id = $1`, [req.params.id]);
  res.json({ ok: true });
});

// ── Products (magnet sizes + tile layouts) ────────────────────────────────────

router.get('/products/sizes', async (_req, res) => {
  const result = await pool.query(
    `SELECT id, label, size_mm, price_per_magnet AS price, active FROM magnet_sizes ORDER BY sort_order`,
  );
  res.json(result.rows);
});

router.patch('/products/sizes/:id', async (req: Request, res: Response) => {
  const { price, active } = req.body;
  const result = await pool.query(
    `UPDATE magnet_sizes SET
       price_per_magnet = COALESCE($2, price_per_magnet),
       active           = COALESCE($3, active)
     WHERE id = $1
     RETURNING id, label, size_mm, price_per_magnet AS price, active`,
    [req.params.id, price ?? null, active ?? null],
  );
  res.json(result.rows[0]);
});

router.get('/products/layouts', async (_req, res) => {
  const result = await pool.query(
    `SELECT id, slug, label, rows, cols, active, bulk_discount_pct, bulk_discount_qty FROM tile_layouts ORDER BY sort_order`,
  );
  res.json(result.rows);
});

router.patch('/products/layouts/:id', async (req: Request, res: Response) => {
  const { active, bulkDiscountPct, bulkDiscountQty } = req.body;
  const result = await pool.query(
    `UPDATE tile_layouts SET
       active            = COALESCE($2, active),
       bulk_discount_pct = COALESCE($3, bulk_discount_pct),
       bulk_discount_qty = $4
     WHERE id = $1
     RETURNING id, slug, label, rows, cols, active, bulk_discount_pct, bulk_discount_qty`,
    [req.params.id, active ?? null, bulkDiscountPct ?? null, bulkDiscountQty ?? null],
  );
  res.json(result.rows[0]);
});

// ── Sales report ──────────────────────────────────────────────────────────────

router.get('/reports/sales', async (req: Request, res: Response) => {
  const days = Math.min(parseInt((req.query.days as string) || '30'), 365);

  const [dailyRes, totalRes] = await Promise.all([
    pool.query(
      `SELECT
         DATE(created_at)    AS date,
         COUNT(*)            AS order_count,
         COALESCE(SUM(total), 0) AS revenue
       FROM orders
       WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
         AND status NOT IN ('cancelled','refunded')
         AND currency = 'GBP'
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [days],
    ),
    pool.query(
      `SELECT
         COUNT(*) AS order_count,
         COALESCE(SUM(total), 0) AS revenue,
         COALESCE(AVG(total), 0) AS avg_order
       FROM orders
       WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
         AND status NOT IN ('cancelled','refunded')
         AND currency = 'GBP'`,
      [days],
    ),
  ]);

  res.json({
    days,
    daily:      dailyRes.rows,
    totalOrders:  parseInt(totalRes.rows[0].order_count),
    totalRevenue: parseFloat(totalRes.rows[0].revenue),
    avgOrder:     parseFloat(totalRes.rows[0].avg_order),
  });
});

export default router;
