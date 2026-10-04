// Photos printed on the homepage magnets — the client's own pictures, cropped
// and compressed by scripts/build-photos.mjs (originals in assets/photos/).
// To change one: replace the original, adjust its crop there, re-run the script.

export const SCENES = {
  village:   '/scenes/village.webp',   // fjord village — used for 3×3 sets
  duck:      '/scenes/duck.webp',
  shipside:  '/scenes/shipside.webp',
  selfie:    '/scenes/selfie.webp',
  pool:      '/scenes/pool.webp',
  walk:      '/scenes/walk.webp',
  sculpture: '/scenes/sculpture.webp',
} as const;

export type SceneName = keyof typeof SCENES;
