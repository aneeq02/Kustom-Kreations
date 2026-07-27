import pool from '../db/pool';

export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const result = await pool.query(
    `SELECT COUNT(*) FROM orders WHERE EXTRACT(YEAR FROM created_at) = $1`,
    [year]
  );
  const seq = parseInt(result.rows[0].count, 10) + 1;
  return `KK-${year}-${String(seq).padStart(4, '0')}`;
}
