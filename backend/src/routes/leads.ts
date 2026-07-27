import { Router } from 'express';
import pool from '../db/pool';

const router = Router();

// Create table on first use — no migration runner needed
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS marketing_leads (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name          TEXT NOT NULL,
      email         TEXT NOT NULL,
      referral_source TEXT,
      created_at    TIMESTAMPTZ DEFAULT now()
    )
  `);
}
ensureTable().catch(err => console.error('leads table init:', err));

router.post('/', async (req, res) => {
  try {
    const { name, email, referralSource } = req.body as {
      name?: string;
      email?: string;
      referralSource?: string;
    };

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'name and email are required' });
    }

    await pool.query(
      `INSERT INTO marketing_leads (name, email, referral_source)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [name.trim(), email.trim().toLowerCase(), referralSource ?? null],
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('Lead capture error:', err);
    res.status(500).json({ error: 'Failed to save lead' });
  }
});

export default router;
