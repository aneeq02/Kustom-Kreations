// Renders the homepage magnet illustrations to WebP once, so the browser
// scales a cheap bitmap instead of re-rasterising SVG every animation frame.
// Run: node scripts/build-scenes.mjs  (outputs public/scenes/*.webp)
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const SIZE = 720;

const SCENES = {
  hills: `<defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EBCDBB"/><stop offset="1" stop-color="#F7EEE4"/></linearGradient></defs>
    <rect width="360" height="360" fill="url(#a)"/>
    <circle cx="250" cy="128" r="46" fill="#FCF6EE"/>
    <path d="M0 205 Q85 150 175 192 T360 176 V360 H0Z" fill="#B8C5B9"/>
    <path d="M0 250 Q115 200 215 246 T360 236 V360 H0Z" fill="#6E9481"/>
    <path d="M0 298 Q140 262 262 298 T360 292 V360 H0Z" fill="#2D4A3E"/>`,
  coast: `<defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F2C9B0"/><stop offset=".55" stop-color="#F8E5D6"/><stop offset=".56" stop-color="#5E9C9A"/><stop offset="1" stop-color="#2F6F72"/></linearGradient></defs>
    <rect width="360" height="360" fill="url(#a)"/>
    <circle cx="180" cy="190" r="52" fill="#FBEFE2"/>
    <rect y="198" width="360" height="162" fill="#3F8586" opacity=".92"/>
    <path d="M70 230h70M190 250h110M40 272h90M160 290h140" stroke="#F6DCCB" stroke-width="5" stroke-linecap="round" opacity=".7"/>
    <path d="M0 318 Q120 296 240 318 T360 314 V360 H0Z" fill="#EBD6BE"/>`,
  night: `<defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1D2B3A"/><stop offset="1" stop-color="#3E5466"/></linearGradient></defs>
    <rect width="360" height="360" fill="url(#a)"/>
    <circle cx="262" cy="92" r="30" fill="#F4EBDC"/><circle cx="276" cy="84" r="27" fill="#24344A"/>
    <g fill="#F4EBDC"><circle cx="60" cy="60" r="2.5"/><circle cx="120" cy="100" r="2"/><circle cx="180" cy="48" r="2.5"/><circle cx="90" cy="150" r="1.8"/><circle cx="320" cy="170" r="2"/><circle cx="210" cy="130" r="1.6"/></g>
    <path d="M0 290 Q180 250 360 285 V360 H0Z" fill="#2A3B30"/>
    <g fill="#1F2E25"><path d="M40 300l28-90 28 90z"/><path d="M95 305l22-70 22 70z"/><path d="M250 300l30-100 30 100z"/><path d="M300 305l22-66 22 66z"/></g>`,
  bloom: `<rect width="360" height="360" fill="#DCE6DD"/>
    <rect y="262" width="360" height="98" fill="#C9D6CB"/>
    <g stroke="#6E9481" stroke-width="5" stroke-linecap="round"><path d="M180 260V150M150 262l-22-90M210 262l26-84"/></g>
    <g fill="#EBC4B4"><circle cx="180" cy="138" r="26"/><circle cx="126" cy="160" r="22"/><circle cx="238" cy="166" r="22"/></g>
    <g fill="#F6E7DD"><circle cx="180" cy="138" r="10"/><circle cx="126" cy="160" r="8"/><circle cx="238" cy="166" r="8"/></g>
    <path d="M140 250h80l-8 70h-64z" fill="#FFFFFF" opacity=".75"/>`,
  city: `<defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C9A6A0"/><stop offset="1" stop-color="#F0D9C8"/></linearGradient></defs>
    <rect width="360" height="360" fill="url(#a)"/>
    <g fill="#3B4656"><rect x="20" y="190" width="56" height="170"/><rect x="84" y="140" width="48" height="220"/><rect x="140" y="210" width="60" height="150"/><rect x="208" y="120" width="44" height="240"/><rect x="260" y="180" width="70" height="180"/></g>
    <g fill="#F6D9A8"><rect x="94" y="160" width="8" height="10"/><rect x="112" y="186" width="8" height="10"/><rect x="218" y="146" width="8" height="10"/><rect x="234" y="190" width="8" height="10"/><rect x="274" y="204" width="8" height="10"/><rect x="300" y="236" width="8" height="10"/><rect x="34" y="214" width="8" height="10"/><rect x="156" y="232" width="8" height="10"/></g>`,
  picnic: `<rect width="360" height="360" fill="#EEDFCC"/>
    <path d="M40 120h280v200H40z" fill="#F7F1EA"/>
    <g fill="#C98C74" opacity=".55"><rect x="40" y="120" width="40" height="200"/><rect x="120" y="120" width="40" height="200"/><rect x="200" y="120" width="40" height="200"/><rect x="280" y="120" width="40" height="200"/></g>
    <g fill="#C98C74" opacity=".35"><rect x="40" y="150" width="280" height="30"/><rect x="40" y="230" width="280" height="30"/></g>
    <circle cx="140" cy="210" r="34" fill="#FFFFFF"/><circle cx="140" cy="210" r="22" fill="#E7B9A5"/>
    <rect x="210" y="172" width="22" height="58" rx="5" fill="#6E9481"/>
    <circle cx="250" cy="250" r="14" fill="#D96E5D"/><circle cx="268" cy="240" r="12" fill="#D96E5D"/>`,
};

mkdirSync('public/scenes', { recursive: true });
for (const [name, body] of Object.entries(SCENES)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 360 360">${body}</svg>`;
  await sharp(Buffer.from(svg)).webp({ quality: 82 }).toFile(`public/scenes/${name}.webp`);
  console.log('wrote', name);
}
