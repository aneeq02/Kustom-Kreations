import { Router, Request, Response } from 'express';
import pool from '../db/pool';

const router = Router();

router.get('/:orderNumber', async (req: Request, res: Response) => {
  const result = await pool.query(`
    SELECT o.id, o.order_number, o.status, o.tracking_number, o.tracking_carrier,
           o.paid_at, o.dispatched_at, o.delivered_at, o.shipping_country,
           o.shipping_first_name,
           sm.name as shipping_method_name, sm.estimated_days_min, sm.estimated_days_max
    FROM orders o
    LEFT JOIN shipping_methods sm ON sm.id = o.shipping_method_id
    WHERE o.order_number = $1
  `, [req.params.orderNumber]);

  if (!result.rows[0]) return res.status(404).json({ error: 'Order not found' });

  const order = result.rows[0];

  const CONFIRMED_STATUSES = ['paid', 'in_production', 'dispatched', 'delivered'];
  const steps = [
    {
      key: 'paid',
      label: 'Order confirmed',
      done: !!order.paid_at || CONFIRMED_STATUSES.includes(order.status),
      date: order.paid_at,
    },
    {
      key: 'in_production',
      label: 'Being made',
      done: ['in_production', 'dispatched', 'delivered'].includes(order.status),
      date: null,
    },
    {
      key: 'dispatched',
      label: 'Dispatched',
      done: ['dispatched', 'delivered'].includes(order.status),
      date: order.dispatched_at,
    },
    {
      key: 'delivered',
      label: 'Delivered',
      done: order.status === 'delivered',
      date: order.delivered_at,
    },
  ];

  res.json({ ...order, steps });
});

export default router;
