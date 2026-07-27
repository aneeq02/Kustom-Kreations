import { Router, Request, Response } from 'express';
import pool from '../db/pool';

const router = Router();

// Supported shipping countries
const SUPPORTED_COUNTRIES = ['GB', 'IM', 'IE'];

router.get('/methods', async (req: Request, res: Response) => {
  const { country, subtotal, currency } = req.query;

  if (!country || !SUPPORTED_COUNTRIES.includes(country as string)) {
    return res.status(400).json({ error: 'Shipping not available to this country', supportedCountries: SUPPORTED_COUNTRIES });
  }

  const curr = currency || 'GBP';
  const sub = parseFloat(subtotal as string || '0');

  const result = await pool.query(`
    SELECT sm.*, sz.name as zone_name
    FROM shipping_methods sm
    JOIN shipping_zones sz ON sz.id = sm.zone_id
    WHERE sz.countries @> ARRAY[$1]::TEXT[]
      AND sm.active = TRUE
    ORDER BY sm.sort_order
  `, [country]);

  const methods = result.rows.map(m => {
    const price = curr === 'EUR' ? m.price_eur : m.price_gbp;
    const freeFrom = curr === 'EUR' ? m.free_from_eur : m.free_from_gbp;
    const isFree = freeFrom !== null && sub >= parseFloat(freeFrom);
    return {
      id: m.id,
      name: m.name,
      description: m.description,
      price: isFree ? 0 : parseFloat(price),
      originalPrice: parseFloat(price),
      isFree,
      freeFrom: freeFrom ? parseFloat(freeFrom) : null,
      estimatedDaysMin: m.estimated_days_min,
      estimatedDaysMax: m.estimated_days_max,
      currency: curr,
    };
  });

  res.json({ methods, currency: curr });
});

router.get('/countries', (_req: Request, res: Response) => {
  res.json({
    supported: [
      { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
      { code: 'IM', name: 'Isle of Man', currency: 'GBP' },
      { code: 'IE', name: 'Republic of Ireland', currency: 'EUR' },
    ],
  });
});

export default router;
