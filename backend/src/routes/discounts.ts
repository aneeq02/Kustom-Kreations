import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { assertDiscountUsable, discountForCode, type DiscountRow } from '../services/pricing';

const router = Router();

/**
 * POST /api/discounts/validate  { code, subtotal }
 * Same rules as checkout (services/pricing.ts). Returns the £ taken off the
 * order total — 0 for free-delivery codes, which waive delivery instead.
 */
router.post('/validate', async (req: Request, res: Response) => {
  const { code, subtotal } = req.body;
  if (!code) return res.status(400).json({ error: 'Code required' });

  const dc = (await pool.query<DiscountRow>(
    'SELECT * FROM discount_codes WHERE UPPER(code) = UPPER($1)', [code],
  )).rows[0];
  const sub = parseFloat(subtotal || '0') || 0;

  try {
    assertDiscountUsable(dc, sub);
  } catch (e: any) {
    return res.status(dc ? 400 : 404).json({ error: e.message });
  }

  const { amount, isFreeShipping } = discountForCode(dc, sub);
  res.json({
    valid: true,
    id: dc.id,
    code: dc.code,
    type: dc.type,
    value: dc.value,
    discountAmount: amount.toFixed(2),
    description: dc.description,
    isFreeShipping,
  });
});

export default router;
