# AI Menu APP Web Frontend

Next.js App Router frontend for the browser version of AI Menu APP.

The header language selector controls both the web page copy and the target language used for menu parsing/cache reads.
Chinese variants display as `Chinese-Simplified` and `Chinese-Traditional` in menus, and compact to `Chinese` after selection.
Header action icons are links so browsers show their destination on hover; the account icon opens `/login` for signed-out users and `/account` for signed-in users. Direct signed-out visits to `/account` return to `/login` with the account page preserved as the post-login destination.
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
npm run test:adsterra
npm run test:adsterra-routes
```

## Render

- Service type: Static Site
- Root directory: `frontend-web`
- Build command: `npm ci && npm run build`
- Publish directory: `out`
- Environment:
  - `NEXT_PUBLIC_API_URL=https://menu-translator-app.onrender.com`
  - `NEXT_PUBLIC_ADSTERRA_ENABLED=false`
  - `NEXT_PUBLIC_ADSTERRA_DESKTOP_KEY=YOUR_728X90_PLACEMENT_KEY`
  - `NEXT_PUBLIC_ADSTERRA_DESKTOP_SCRIPT_URL=https://YOUR_ADSTERRA_DOMAIN/PATH/invoke.js`
  - `NEXT_PUBLIC_ADSTERRA_MOBILE_KEY=YOUR_320X50_PLACEMENT_KEY`
  - `NEXT_PUBLIC_ADSTERRA_MOBILE_SCRIPT_URL=https://YOUR_ADSTERRA_DOMAIN/PATH/invoke.js`

Create separate 728x90 desktop and 320x50 mobile Banner placements in the
Adsterra publisher dashboard, then copy the key and HTTPS `invoke.js` URL from
each generated ad code. Keep `NEXT_PUBLIC_ADSTERRA_ENABLED=false` until both
placements are approved and configured. The API token is only for server-side
reporting and must never be stored in a `NEXT_PUBLIC_` variable.

Adsterra banners are limited to manually reviewed, content-rich routes. Login,
loading, empty-state, legal, account, and generated result screens stay ad-free.
The implementation intentionally does not enable Popunder or forced redirects.
