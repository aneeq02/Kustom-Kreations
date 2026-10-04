// Crops the client's photos (assets/photos/) to squares and compresses them to
// small WebP files in public/scenes/ for the homepage magnet animations.
// Run after adding or changing a photo:  node scripts/build-photos.mjs
//
// Crops are [left, top, size] in the original image's pixels — chosen so the
// people/subject stay inside the square (and, for 3×3 sets, so faces don't
// fall on the gaps between tiles).
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const OUT = 720; // px — sharp on 2× screens at the largest on-page magnet size

const PHOTOS = {
  village:   { src: 'fjord-village.jpeg',       crop: [400, 0, 1200] },  // 3×3 sets — a landscape splits cleanly
  duck:      { src: 'girl-with-duck.jpeg',      crop: [0, 150, 720] },
  shipside:  { src: 'girl-by-ship.jpeg',        crop: [0, 190, 960] },
  selfie:    { src: 'mum-daughter-selfie.jpeg', crop: [130, 40, 720] },
  pool:      { src: 'pool.jpeg',                crop: [0, 110, 720] },
  walk:      { src: 'walk-to-ship.jpeg',        crop: [0, 250, 1200] },
  sculpture: { src: 'fish-sculpture.jpeg',      crop: [30, 0, 1220] },
};

mkdirSync('public/scenes', { recursive: true });
for (const [name, { src, crop: [left, top, size] }] of Object.entries(PHOTOS)) {
  await sharp(`assets/photos/${src}`)
    .rotate() // respect EXIF orientation
    .extract({ left, top, width: size, height: size })
    .resize(OUT, OUT)
    .webp({ quality: 80 })
    .toFile(`public/scenes/${name}.webp`);
  console.log('wrote', name);
}
