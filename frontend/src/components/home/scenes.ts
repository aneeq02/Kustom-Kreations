// Pictures printed on the homepage magnets. Pre-rendered WebP bitmaps
// (source drawings + generator: scripts/build-scenes.mjs). Swap any entry
// for a real product photo, e.g. '/photos/beach.webp'.

export const SCENES = {
  hills: '/scenes/hills.webp',
  coast: '/scenes/coast.webp',
  night: '/scenes/night.webp',
  bloom: '/scenes/bloom.webp',
  city: '/scenes/city.webp',
  picnic: '/scenes/picnic.webp',
} as const;

export type SceneName = keyof typeof SCENES;
