import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Resolved once at startup so the path is stable regardless of cwd
const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads'));

// Ensure the directory exists when this module loads
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

/**
 * Save a buffer to the local uploads folder.
 * Returns the relative key (e.g. "uploads/abc123.jpg") used everywhere
 * in the database so switching to S3 later only requires changing this file.
 */
export async function uploadFile(
  buffer: Buffer,
  mimeType: string,
  folder: 'uploads' | 'print-files' = 'uploads'
): Promise<string> {
  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const filename = `${uuidv4()}.${ext}`;
  const subfolder = path.join(UPLOADS_DIR, folder);
  fs.mkdirSync(subfolder, { recursive: true });
  fs.writeFileSync(path.join(subfolder, filename), buffer);
  return `${folder}/${filename}`;
}

/**
 * Returns the public URL for a stored file key.
 * In dev this is a localhost URL; swap to a CDN prefix in production.
 */
export function getFileUrl(key: string): string {
  const base = process.env.UPLOADS_BASE_URL || 'http://localhost:4000/uploads';
  return `${base}/${key}`;
}

export async function deleteFile(key: string): Promise<void> {
  try {
    fs.unlinkSync(path.join(UPLOADS_DIR, key));
  } catch {
    // Ignore — file may already be gone
  }
}
