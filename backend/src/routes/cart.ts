import { Router, Request, Response } from 'express';
import pool from '../db/pool';

const router = Router();

// Persist abandoned cart (called on cart update with email)
router.post('/save', async (req: Request, res: Response) => {
  const { sessionId, email, cartData } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

  await pool.query(`
    INSERT INTO abandoned_carts (session_id, email, cart_data, last_activity)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (session_id) DO UPDATE
      SET email=$2, cart_data=$3, last_activity=NOW(), converted=FALSE
  `, [sessionId, email ?? null, JSON.stringify(cartData)]);

  res.json({ ok: true });
});

// Mark cart as converted
router.post('/converted', async (req: Request, res: Response) => {
  const { sessionId } = req.body;
  if (sessionId) {
    await pool.query('UPDATE abandoned_carts SET converted=TRUE WHERE session_id=$1', [sessionId]);
  }
  res.json({ ok: true });
});

// Recover cart by session
router.get('/recover/:sessionId', async (req: Request, res: Response) => {
  const result = await pool.query(
    'SELECT cart_data FROM abandoned_carts WHERE session_id=$1 AND converted=FALSE',
    [req.params.sessionId]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Cart not found' });
  res.json(result.rows[0].cart_data);
});

export default router;
