import { Router, Request, Response } from 'express';
import pool from '../db/pool';

const router = Router();

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS magnet_sizes (
      id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
      size_mm          INTEGER NOT NULL UNIQUE,
      label            TEXT    NOT NULL,
      price_per_magnet NUMERIC(10,2) NOT NULL,
      active           BOOLEAN NOT NULL DEFAULT true,
      sort_order       INTEGER NOT NULL DEFAULT 0
    )
  `);

  await pool.query(`
    INSERT INTO magnet_sizes (size_mm, label, price_per_magnet, active, sort_order)
    VALUES (50, '50mm', 2.99, true, 0),
           (75, '75mm', 3.49, true, 1)
    ON CONFLICT (size_mm) DO UPDATE
      SET label      = EXCLUDED.label,
          sort_order = EXCLUDED.sort_order
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tile_layouts (
      id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
      slug              TEXT    NOT NULL UNIQUE,
      label             TEXT    NOT NULL,
      description       TEXT    NOT NULL DEFAULT '',
      rows              INTEGER NOT NULL,
      cols              INTEGER NOT NULL,
      active            BOOLEAN NOT NULL DEFAULT false,
      badge             TEXT,
      bulk_discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
      bulk_discount_qty INTEGER,
      sort_order        INTEGER NOT NULL DEFAULT 0
    )
  `);

  await pool.query(`
    INSERT INTO tile_layouts
      (slug, label, description, rows, cols, active, badge, bulk_discount_pct, sort_order)
    VALUES
      ('1x1',   'Single',  '1 magnet',                              1, 1, true,  NULL,      0,  0),
      ('2x2',   '2x2 Set', '4 magnets',                             2, 2, false, NULL,     10,  1),
      ('3x3',   '3x3 Set', '9 magnets - one photo across a 3x3 grid',3,3, true, 'Popular', 15,  2),
      ('4x4',   '4x4 Set', '16 magnets',                            4, 4, false, NULL,     20,  3),
      ('5x5',   '5x5 Set', '25 magnets',                            5, 5, false, NULL,     20,  4)
    ON CONFLICT (slug) DO UPDATE
      SET label       = EXCLUDED.label,
          description = EXCLUDED.description,
          badge       = EXCLUDED.badge,
          sort_order  = EXCLUDED.sort_order
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS magnet_print_config (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      label TEXT NOT NULL
    )
  `);

  await pool.query(`
    INSERT INTO magnet_print_config (key, value, label)
    VALUES ('target_dpi',   '300', 'Target print DPI'),
           ('bleed_mm',     '3',   'Bleed in millimetres'),
           ('safe_area_mm', '2',   'Safe area in millimetres')
    ON CONFLICT (key) DO NOTHING
  `);

  // Ensure the product_categories + products rows exist so image upload validation works
  await pool.query(`
    INSERT INTO product_categories (slug, name, description)
    VALUES ('magnets', 'Photo Magnets', 'Personalised photo magnets')
    ON CONFLICT (slug) DO NOTHING
  `);

  await pool.query(`
    INSERT INTO products (
      category_id, slug, name, description,
      width_mm, height_mm, min_dpi, warn_dpi, target_dpi,
      base_price_gbp, base_price_eur
    )
    SELECT
      c.id,
      'photo-magnet-50mm',
      '50mm Photo Magnet',
      'A personalised 50mm x 50mm square photo magnet.',
      50, 50, 100, 150, 300,
      2.99, 3.49
    FROM product_categories c
    WHERE c.slug = 'magnets'
    ON CONFLICT (slug) DO NOTHING
  `);
}

// Migrate existing databases that predate these columns
pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS referral_source TEXT`)
  .catch(() => {});
pool.query(`ALTER TABLE magnet_sizes ADD COLUMN IF NOT EXISTS bulk_discount_pct NUMERIC(5,2) NOT NULL DEFAULT 15`)
  .catch(() => {});
pool.query(`DELETE FROM tile_layouts WHERE slug = 'custom'`)
  .catch(() => {});
pool.query(`ALTER TABLE tile_layouts ADD COLUMN IF NOT EXISTS bulk_discount_qty INTEGER`)
  .catch(() => {});

ensureTables().catch(err => console.error('Magnet table init error:', err));

/* ── Public: frontend config ─────────────────────────────────────── */

/** GET /api/magnets/config */
router.get('/config', async (_req: Request, res: Response) => {
  const [sizesRes, layoutsRes, configRes] = await Promise.all([
    pool.query('SELECT * FROM magnet_sizes ORDER BY sort_order'),
    pool.query('SELECT * FROM tile_layouts ORDER BY sort_order'),
    pool.query('SELECT key, value FROM magnet_print_config'),
  ]);

  const printConfig: Record<string, number> = {};
  for (const row of configRes.rows) {
    printConfig[snakeToCamel(row.key)] = parseFloat(row.value);
  }

  res.json({
    sizes: sizesRes.rows.map(r => ({
      id: r.id,
      sizeMm: Number(r.size_mm),
      label: r.label,
      pricePerMagnet: parseFloat(r.price_per_magnet),
      bulkDiscountPct: parseFloat(r.bulk_discount_pct ?? 0),
      active: r.active,
      sortOrder: Number(r.sort_order),
    })),
    layouts: layoutsRes.rows.map(r => ({
      id: r.id,
      slug: r.slug,
      label: r.label,
      description: r.description,
      rows: Number(r.rows),
      cols: Number(r.cols),
      active: r.active,
      badge: r.badge,
      bulkDiscountPct: parseFloat(r.bulk_discount_pct),
      bulkDiscountQty: r.bulk_discount_qty !== null ? Number(r.bulk_discount_qty) : null,
      sortOrder: Number(r.sort_order),
    })),
    printConfig,
  });
});

/* ── Admin: update sizes ──────────────────────────────────────────── */
// Auth middleware will be added here when the admin panel is built.

/** PUT /api/magnets/sizes/:id */
router.put('/sizes/:id', async (req: Request, res: Response) => {
  const { label, pricePerMagnet, active, bulkDiscountPct } = req.body;
  await pool.query(
    `UPDATE magnet_sizes
     SET label = $1, price_per_magnet = $2, active = $3,
         bulk_discount_pct = COALESCE($4, bulk_discount_pct)
     WHERE id = $5`,
    [label, pricePerMagnet, active, bulkDiscountPct ?? null, req.params.id],
  );
  res.json({ ok: true });
});

/** PUT /api/magnets/layouts/:id */
router.put('/layouts/:id', async (req: Request, res: Response) => {
  const { label, description, active, badge, bulkDiscountPct } = req.body;
  await pool.query(
    `UPDATE tile_layouts
     SET label = $1, description = $2, active = $3, badge = $4, bulk_discount_pct = $5
     WHERE id = $6`,
    [label, description, active, badge ?? null, bulkDiscountPct, req.params.id],
  );
  res.json({ ok: true });
});

/** PUT /api/magnets/print-config */
router.put('/print-config', async (req: Request, res: Response) => {
  const { targetDpi, bleedMm, safeAreaMm } = req.body;
  await Promise.all([
    pool.query('UPDATE magnet_print_config SET value = $1 WHERE key = $2', [String(targetDpi), 'target_dpi']),
    pool.query('UPDATE magnet_print_config SET value = $1 WHERE key = $2', [String(bleedMm), 'bleed_mm']),
    pool.query('UPDATE magnet_print_config SET value = $1 WHERE key = $2', [String(safeAreaMm), 'safe_area_mm']),
  ]);
  res.json({ ok: true });
});

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

export default router;
