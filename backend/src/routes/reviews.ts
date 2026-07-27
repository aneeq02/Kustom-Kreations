import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/product/:productId', async (req: Request, res: Response) => {
  const result = await pool.query(`
    SELECT r.id, r.rating, r.title, r.body, r.verified_purchase, r.created_at,
           c.first_name
    FROM reviews r
    LEFT JOIN customers c ON c.id = r.customer_id
    WHERE r.product_id = $1 AND r.approved = TRUE
    ORDER BY r.created_at DESC LIMIT 50
  `, [req.params.productId]);

  const avg = result.rows.length
    ? (result.rows.reduce((s, r) => s + r.rating, 0) / result.rows.length).toFixed(1)
    : null;

  res.json({ reviews: result.rows, averageRating: avg, count: result.rows.length });
});

router.post('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  const { productId, orderId, rating, title, body } = req.body;
  if (!productId || !rating) return res.status(400).json({ error: 'productId and rating required' });

  // Verify purchase if customer is logged in
  let verifiedPurchase = false;
  if (req.customerId && orderId) {
    const check = await pool.query(
      'SELECT id FROM orders WHERE id=$1 AND customer_id=$2 AND status NOT IN ($3,$4)',
      [orderId, req.customerId, 'cancelled', 'refunded']
    );
    verifiedPurchase = check.rows.length > 0;
  }

  const result = await pool.query(`
    INSERT INTO reviews (product_id, order_id, customer_id, rating, title, body, verified_purchase, approved)
    VALUES ($1,$2,$3,$4,$5,$6,$7,FALSE) RETURNING id
  `, [productId, orderId ?? null, req.customerId ?? null, rating, title ?? null, body ?? null, verifiedPurchase]);

  res.status(201).json({ id: result.rows[0].id, message: 'Review submitted and awaiting approval — thank you!' });
});

export default router;
