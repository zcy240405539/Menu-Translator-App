const ADSENSE_CONTENT_PATHS = new Set([
  "/",
  "/how-it-works",
  "/menu-translation-guide",
  "/menu-examples",
  "/supported-languages",
]);

function normalizePathname(pathname: string) {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "");
}

export function isAdsenseContentPath(pathname: string) {
  return ADSENSE_CONTENT_PATHS.has(normalizePathname(pathname));
}

export function shouldLoadAdsense(
  pathname: string,
  searchParams: Pick<URLSearchParams, "has">,
  enabled: boolean,
  client: string,
) {
  const isMenuResult = searchParams.has("menu_hash") || searchParams.has("show_recommend");
  return enabled && Boolean(client) && isAdsenseContentPath(pathname) && !isMenuResult;
}
