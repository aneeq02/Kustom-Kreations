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
| `scripts/build-scenes.mjs` | Regenerates the homepage illustrations in `public/scenes/` |

Design tokens (colours, fonts, radius) live in `src/app/globals.css`. The brand green is `--color-brand`.
