import { Router, Request, Response } from 'express';
import pool from '../db/pool';

const router = Router();

// List all active products (with bulk discount tiers)
router.get('/', async (_req: Request, res: Response) => {
  const products = await pool.query(`
    SELECT p.*, pc.name as category_name, pc.slug as category_slug
    FROM products p
    JOIN product_categories pc ON pc.id = p.category_id
    WHERE p.active = TRUE
    ORDER BY p.sort_order, p.created_at
  `);

  const tiers = await pool.query(`
    SELECT * FROM bulk_discount_tiers
    WHERE active = TRUE
    ORDER BY product_id, sort_order
  `);

  const tiersByProduct: Record<string, typeof tiers.rows> = {};
  for (const t of tiers.rows) {
    if (!tiersByProduct[t.product_id]) tiersByProduct[t.product_id] = [];
    tiersByProduct[t.product_id].push(t);
  }

  res.json(products.rows.map(p => ({
    ...p,
    discountTiers: tiersByProduct[p.id] ?? [],
  })));
});

// Single product by slug
router.get('/:slug', async (req: Request, res: Response) => {
  const result = await pool.query(`
    SELECT p.*, pc.name as category_name, pc.slug as category_slug
    FROM products p
    JOIN product_categories pc ON pc.id = p.category_id
    WHERE p.slug = $1 AND p.active = TRUE
  `, [req.params.slug]);

  if (!result.rows[0]) return res.status(404).json({ error: 'Product not found' });

  const tiers = await pool.query(
    'SELECT * FROM bulk_discount_tiers WHERE product_id=$1 AND active=TRUE ORDER BY sort_order',
    [result.rows[0].id]
  );

  const reviews = await pool.query(`
    SELECT r.*, c.first_name FROM reviews r
    LEFT JOIN customers c ON c.id = r.customer_id
    WHERE r.product_id = $1 AND r.approved = TRUE
    ORDER BY r.created_at DESC LIMIT 20
  `, [result.rows[0].id]);

  res.json({
    ...result.rows[0],
    discountTiers: tiers.rows,
    reviews: reviews.rows,
    averageRating: reviews.rows.length
      ? (reviews.rows.reduce((s, r) => s + r.rating, 0) / reviews.rows.length).toFixed(1)
      : null,
  });
});

export default router;
