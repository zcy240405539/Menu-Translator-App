# AI Menu APP Web Frontend

Next.js App Router frontend for the browser version of AI Menu APP.

The header language selector controls both the web page copy and the target language used for menu parsing/cache reads.
Chinese variants display as `Chinese-Simplified` and `Chinese-Traditional` in menus, and compact to `Chinese` after selection.
Header action icons are links so browsers show their destination on hover; the account icon opens `/login` instead of starting Google OAuth directly.
History and cart header icons link to `/history` and `/cart`; those pages read signed-in user data from the backend.

## Local Development

```bash
npm install
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000 npm run dev
```

On Windows PowerShell:

```powershell
$env:NEXT_PUBLIC_API_URL="http://127.0.0.1:8000"
npm run dev
```

## Build

```bash
npm run lint
npm run build
```

## Render

- Service type: Static Site
- Root directory: `frontend-web`
- Build command: `npm ci && npm run build`
- Publish directory: `out`
- Environment:
  - `NEXT_PUBLIC_API_URL=https://menu-translator-app.onrender.com`
  - `NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-8286400764174465`
  - `NEXT_PUBLIC_ADSENSE_ANALYZE_SLOT=<AdSense ad unit slot id>`
  - `NEXT_PUBLIC_ADSENSE_BANNER_SLOT=<footer display ad unit slot id>`
  - `NEXT_PUBLIC_ADSENSE_DETAIL_SLOT=<dish dialog display ad unit slot id>`
  - `NEXT_PUBLIC_ADSENSE_TEST=false`

`NEXT_PUBLIC_ADSENSE_TEST=true` is only for local or staging ad rendering checks.
Fixed footer and dialog placements require valid display ad unit slot IDs. Real ads
are served only after the site status is `Ready` in AdSense. A processed unit with
`data-ad-status="unfilled"` means Google received the request but returned no ad;
check site approval, Policy Center, consent, and AdSense coverage rather than
changing the frontend slot markup.
