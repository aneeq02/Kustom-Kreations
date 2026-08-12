import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db/pool';

const router = Router();

function generateVoucherCode(): string {
  return 'KK-' + uuidv4().replace(/-/g, '').toUpperCase().slice(0, 10);
}

// Validate a gift voucher
router.post('/validate', async (req: Request, res: Response) => {
  const { code } = req.body;

  const result = await pool.query(`
    SELECT * FROM gift_vouchers
    WHERE UPPER(code) = UPPER($1)
      AND active = TRUE
      AND (valid_until IS NULL OR valid_until >= NOW())
  `, [code]);

  if (!result.rows[0]) return res.status(404).json({ error: 'Invalid or expired gift voucher' });

  const v = result.rows[0];
  const balance = parseFloat(v.remaining_balance_gbp ?? v.initial_balance_gbp ?? '0');

  res.json({
    valid: true,
    id: v.id,
    code: v.code,
    balance: balance.toFixed(2),
    currency: 'GBP',
  });
});

// Purchase a gift voucher (creates the voucher, returns code for order)
router.post('/purchase', async (req: Request, res: Response) => {
  const { amountGbp, recipientEmail, recipientName, message, purchaserEmail } = req.body;
  if (!amountGbp) return res.status(400).json({ error: 'Amount required' });

  const code = generateVoucherCode();
  const result = await pool.query(`
    INSERT INTO gift_vouchers
      (code, initial_balance_gbp, remaining_balance_gbp,
       purchaser_email, recipient_email, recipient_name, message, valid_until)
    VALUES ($1,$2,$2,$3,$4,$5,$6, NOW() + INTERVAL '2 years')
    RETURNING *
  `, [code, amountGbp, purchaserEmail, recipientEmail, recipientName, message]);

  res.status(201).json(result.rows[0]);
});

export default router;
