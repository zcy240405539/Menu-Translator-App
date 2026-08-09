# AI Menu APP Web Frontend

Next.js App Router frontend for the browser version of AI Menu APP.

The header language selector controls both the web page copy and the target language used for menu parsing/cache reads.
Chinese variants display as `Chinese-Simplified` and `Chinese-Traditional` in menus, and compact to `Chinese` after selection.
Header action icons are links so browsers show their destination on hover; the account icon opens `/login` instead of starting Google OAuth directly.
History and cart header icons link to `/history` and `/cart`; those pages read signed-in user data from the backend.
The checked-in UI components are deployed directly; the `shadcn` generator is a development-only dependency.

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
npm run test:adsense
```

## Render

- Service type: Static Site
- Root directory: `frontend-web`
- Build command: `npm ci && npm run build`
- Publish directory: `out`
- Environment:
  - `NEXT_PUBLIC_API_URL=https://menu-translator-app.onrender.com`
  - `NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-8286400764174465`
  - `NEXT_PUBLIC_ADSENSE_ENABLED=false`

The publisher verification meta tag remains active while AdSense is under review.
Keep `NEXT_PUBLIC_ADSENSE_ENABLED=false` so Google-served ads cannot appear on
login, loading, empty-state, legal, or automatically generated result screens.
After the site is approved, add ads only to manually reviewed, content-rich pages.
