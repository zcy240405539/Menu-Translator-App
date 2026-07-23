# AI Menu APP Web Frontend

Next.js App Router frontend for the browser version of AI Menu APP.

The header language selector controls both the web page copy and the target language used for menu parsing/cache reads.
Chinese variants display as `Chinese-Simplified` and `Chinese-Traditional` in menus, and compact to `Chinese` after selection.
Header action icons are links so browsers show their destination on hover; the account icon opens `/login` instead of starting Google OAuth directly.

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
  - `NEXT_PUBLIC_ADSENSE_TEST=false`

`NEXT_PUBLIC_ADSENSE_TEST=true` is only for local or staging ad rendering checks.
