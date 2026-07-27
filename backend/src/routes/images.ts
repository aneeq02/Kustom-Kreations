import { Router, Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import pool from '../db/pool';
import { uploadFile, getFileUrl } from '../services/storage';
import { validateImageQuality } from '../utils/imageValidation';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    cb(null, allowed.includes(file.mimetype));
  },
});

/**
 * POST /api/images/upload
 * Validates quality, saves original + thumbnail to local uploads folder.
 * Returns: imageKey, thumbKey, thumbUrl, quality status, dpi.
 */
router.post('/upload', upload.single('photo'), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

  const productSlug = req.body.productSlug || 'photo-magnet-50mm';
  const productResult = await pool.query(
    'SELECT width_mm, height_mm, min_dpi, warn_dpi, target_dpi FROM products WHERE slug=$1',
    [productSlug]
  );
  // Fall back to sensible defaults so uploads work even before the products table is seeded
  const { width_mm = 50, height_mm = 50, min_dpi = 100, warn_dpi = 150, target_dpi = 300 } =
    productResult.rows[0] ?? {};

  // Convert HEIC to JPEG if needed
  let buffer = req.file.buffer;
  let mimeType = req.file.mimetype;
  if (mimeType === 'image/heic' || mimeType === 'image/heif') {
    buffer = await sharp(buffer).toFormat('jpeg').toBuffer();
    mimeType = 'image/jpeg';
  }

  const quality = await validateImageQuality(buffer, width_mm, height_mm, min_dpi, warn_dpi, target_dpi);

  if (quality.status === 'blocked') {
    return res.status(422).json({ error: quality.message, quality });
  }

  // Generate 400×400 thumbnail
  const thumb = await sharp(buffer)
    .resize(400, 400, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 85 })
    .toBuffer();

  const [imageKey, thumbKey] = await Promise.all([
    uploadFile(buffer, mimeType, 'uploads'),
    uploadFile(thumb, 'image/jpeg', 'uploads'),
  ]);

  res.json({
    imageKey,
    thumbKey,
    thumbUrl: getFileUrl(thumbKey),
    quality: quality.status,
    dpi: quality.dpi,
    message: quality.message,
    width: quality.widthPx,
    height: quality.heightPx,
  });
});

/**
 * POST /api/images/url
 * Returns the public URL for a stored file key.
 */
router.post('/url', (req: Request, res: Response) => {
  const { key } = req.body;
  if (!key) return res.status(400).json({ error: 'key required' });
  res.json({ url: getFileUrl(key) });
});

export default router;
