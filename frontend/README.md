# Kustom Kreations — Frontend

The Next.js 16 (App Router) storefront and admin panel for Kustom Kreations.
See the [project README](../README.md) for the full overview, setup and environment variables.

```bash
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL and NEXT_PUBLIC_PAYPAL_CLIENT_ID
npm install
npm run dev                        # http://localhost:3000
```

| Path | What lives there |
|---|---|
| `src/app/page.tsx` + `src/components/home/` | Animated homepage (hero, jigsaw, how-it-works, …) |
| `src/app/configure/` + `src/components/studio/` | The magnet studio (editor, add sheet, magnet previews) |
| `src/components/bag/`, `src/components/checkout/` | Slide-in bag and PayPal checkout |
| `src/app/admin/` + `src/components/admin/` | PIN-protected admin panel and its shared UI kit |
| `src/lib/` | API client, pricing, studio helpers, admin status map |
| `assets/photos/` + `scripts/build-photos.mjs` | Client photos (originals) → square WebP crops in `public/scenes/` used by the homepage animations. Run `node scripts/build-photos.mjs` after changing a photo. |

Design tokens (colours, fonts, radius) live in `src/app/globals.css`. The brand green is `--color-brand`.

## Production build

`npm run build` runs `next build --webpack` on purpose. Turbopack (the Next.js 16 default) runs the Tailwind/PostCSS step in a separate Node process, and Hostinger's build environment kills it, so the build fails with `TurbopackInternalError … globals.css`. Keep webpack for production builds; `npm run dev` can still use Turbopack.
