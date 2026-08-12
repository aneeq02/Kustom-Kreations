import { Router, Request, Response } from 'express';
import pool from '../db/pool';

const router = Router();

router.post('/validate', async (req: Request, res: Response) => {
  const { code, subtotal } = req.body;
  if (!code) return res.status(400).json({ error: 'Code required' });

  const now = new Date();
  const result = await pool.query(`
    SELECT * FROM discount_codes
    WHERE UPPER(code) = UPPER($1)
      AND active = TRUE
      AND (valid_from IS NULL OR valid_from <= $2)
      AND (valid_until IS NULL OR valid_until >= $2)
      AND (max_uses IS NULL OR uses_count < max_uses)
  `, [code, now]);

  if (!result.rows[0]) return res.status(404).json({ error: 'Invalid or expired promo code' });

  const dc = result.rows[0];
  const sub = parseFloat(subtotal || '0');
  const minOrder = dc.min_order_gbp;

  if (minOrder && sub < parseFloat(minOrder)) {
    return res.status(400).json({
      error: `Minimum order of £${parseFloat(minOrder).toFixed(2)} required for this code`,
    });
  }

  let discountAmount = 0;
  if (dc.type === 'percent') {
    discountAmount = (sub * parseFloat(dc.value)) / 100;
  } else if (dc.type === 'fixed_gbp') {
    discountAmount = Math.min(parseFloat(dc.value), sub);
  } else if (dc.type === 'free_shipping') {
    discountAmount = 0; // handled at checkout
  }

  res.json({
    valid: true,
    id: dc.id,
    code: dc.code,
    type: dc.type,
    value: dc.value,
    discountAmount: discountAmount.toFixed(2),
    description: dc.description,
    isFreeShipping: dc.type === 'free_shipping',
  });
});

export default router;
