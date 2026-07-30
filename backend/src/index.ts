import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import pool from './db/pool';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';

import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import imageRoutes from './routes/images';
import cartRoutes from './routes/cart';
import checkoutRoutes from './routes/checkout';
import shippingRoutes from './routes/shipping';
import discountRoutes from './routes/discounts';
import voucherRoutes from './routes/vouchers';
import reviewRoutes from './routes/reviews';
import trackingRoutes from './routes/tracking';
import webhookRoutes from './routes/webhooks';
import leadRoutes from './routes/leads';
import magnetRoutes from './routes/magnets';
import adminRoutes from './routes/admin';

const app = express();
const PORT = process.env.PORT || 4000;

// CORS — must run before everything including helmet
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',').map(o => o.trim());

app.use((req, res, next) => {
  const origin = req.headers.origin as string | undefined;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-admin-pin');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Webhooks must be raw body before json parser
app.use('/api/webhooks', webhookRoutes);

// Serve uploaded files BEFORE helmet so restrictive headers don't block cross-origin image loads
const uploadsDir = path.resolve(process.env.UPLOADS_DIR || path.join(__dirname, '../uploads'));
app.use('/uploads', (_req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadsDir));

app.use(helmet());
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/magnets', magnetRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/health/db', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(503).json({ status: 'error', detail: err instanceof Error ? err.message : String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Kustom Kreations API running on port ${PORT}`);
});

export default app;
