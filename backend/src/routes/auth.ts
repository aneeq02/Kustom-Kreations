import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db/pool';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { sendPasswordReset } from '../services/email';

const router = Router();

function issueTokens(customerId: string, res: Response) {
  // Cast needed because process.env returns string, but jsonwebtoken types
  // want a branded StringValue literal. The values are validated at startup.
  const access = jwt.sign({ sub: customerId }, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as `${number}${'s'|'m'|'h'|'d'}`,
  });
  const refresh = jwt.sign({ sub: customerId }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as `${number}${'s'|'m'|'h'|'d'}`,
  });
  res.cookie('access_token', access, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 15 * 60 * 1000 });
  res.cookie('refresh_token', refresh, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/auth/refresh', maxAge: 30 * 24 * 60 * 60 * 1000 });
  return access;
}

// Register
router.post('/register',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('firstName').trim().notEmpty(),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password, firstName, lastName, marketingOptIn } = req.body;
    const hash = await bcrypt.hash(password, 12);

    try {
      const result = await pool.query(
        `INSERT INTO customers (email, password_hash, first_name, last_name, marketing_opt_in)
         VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name`,
        [email, hash, firstName, lastName, marketingOptIn ?? false]
      );
      const customer = result.rows[0];
      const token = issueTokens(customer.id, res);
      res.status(201).json({ customer, token });
    } catch (err: any) {
      if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' });
      throw err;
    }
  }
);

// Login
router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM customers WHERE email = $1', [email]);
    const customer = result.rows[0];
    if (!customer || !customer.password_hash) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, customer.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = issueTokens(customer.id, res);
    res.json({
      customer: { id: customer.id, email: customer.email, firstName: customer.first_name, lastName: customer.last_name },
      token,
    });
  }
);

// Refresh
router.post('/refresh', async (req: Request, res: Response) => {
  const token = req.cookies?.refresh_token;
  if (!token) return res.status(401).json({ error: 'No refresh token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { sub: string };
    const access = issueTokens(payload.sub, res);
    res.json({ token: access });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Logout
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token', { path: '/api/auth/refresh' });
  res.json({ ok: true });
});

// Me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const result = await pool.query(
    'SELECT id, email, first_name, last_name, phone, marketing_opt_in, created_at FROM customers WHERE id = $1',
    [req.customerId]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Customer not found' });
  res.json(result.rows[0]);
});

// Forgot password
router.post('/forgot-password', body('email').isEmail(), async (req: Request, res: Response) => {
  const { email } = req.body;
  const result = await pool.query('SELECT id FROM customers WHERE email = $1', [email]);
  if (result.rows[0]) {
    const token = uuidv4();
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO refresh_tokens (customer_id, token_hash, expires_at) VALUES ($1, crypt($2, gen_salt('bf')), $3)`,
      [result.rows[0].id, token, expires]
    );
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}&id=${result.rows[0].id}`;
    await sendPasswordReset(email, resetUrl);
  }
  // Always 200 to avoid email enumeration
  res.json({ message: 'If that email is registered you will receive a reset link.' });
});

// Update profile
router.put('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const { firstName, lastName, phone, marketingOptIn } = req.body;
  const result = await pool.query(
    `UPDATE customers SET first_name=$1, last_name=$2, phone=$3, marketing_opt_in=$4, updated_at=NOW()
     WHERE id=$5 RETURNING id, email, first_name, last_name, phone, marketing_opt_in`,
    [firstName, lastName, phone, marketingOptIn, req.customerId]
  );
  res.json(result.rows[0]);
});

// Addresses
router.get('/addresses', requireAuth, async (req: AuthRequest, res: Response) => {
  const result = await pool.query(
    'SELECT * FROM customer_addresses WHERE customer_id=$1 ORDER BY is_default DESC, created_at DESC',
    [req.customerId]
  );
  res.json(result.rows);
});

router.post('/addresses', requireAuth, async (req: AuthRequest, res: Response) => {
  const { label, firstName, lastName, line1, line2, city, county, postcode, country, isDefault } = req.body;
  if (isDefault) {
    await pool.query('UPDATE customer_addresses SET is_default=FALSE WHERE customer_id=$1', [req.customerId]);
  }
  const result = await pool.query(
    `INSERT INTO customer_addresses (customer_id, label, first_name, last_name, line1, line2, city, county, postcode, country, is_default)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [req.customerId, label, firstName, lastName, line1, line2, city, county, postcode, country, isDefault ?? false]
  );
  res.status(201).json(result.rows[0]);
});

export default router;
