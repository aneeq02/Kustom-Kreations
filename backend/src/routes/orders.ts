import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getFileUrl } from '../services/storage';

const router = Router();

// Customer's own orders
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const result = await pool.query(`
    SELECT o.*, array_agg(json_build_object(
      'id', oi.id, 'quantity', oi.quantity, 'unitPrice', oi.unit_price,
      'totalPrice', oi.total_price, 'thumbKey', oi.image_key
    )) as items
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.customer_id = $1
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `, [req.customerId]);
  res.json(result.rows);
});

// Single order
router.get('/:id', async (req: Request, res: Response) => {
  const result = await pool.query(`
    SELECT o.*, sm.name as shipping_method_name
    FROM orders o
    LEFT JOIN shipping_methods sm ON sm.id = o.shipping_method_id
    WHERE o.id = $1
  `, [req.params.id]);

  if (!result.rows[0]) return res.status(404).json({ error: 'Order not found' });

  const items = await pool.query(`
    SELECT oi.*, p.name as product_name, p.slug as product_slug
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = $1
  `, [req.params.id]);

  const enrichedItems = items.rows.map(i => ({
    ...i,
    thumbUrl: getFileUrl(i.image_key),
  }));

  res.json({ ...result.rows[0], items: enrichedItems });
});

export default router;
