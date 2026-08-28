export const ADSTERRA_CONTENT_PATHS = [
  "/",
  "/how-it-works",
  "/menu-translation-guide",
  "/menu-examples",
  "/supported-languages",
] as const;

const ADSTERRA_CONTENT_PATH_SET = new Set<string>(ADSTERRA_CONTENT_PATHS);

function normalizePathname(pathname: string) {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "");
}

export function isAdsterraContentPath(pathname: string) {
  return ADSTERRA_CONTENT_PATH_SET.has(normalizePathname(pathname));
}

export function shouldLoadAdsterra(
  pathname: string,
  searchParams: Pick<URLSearchParams, "has">,
  enabled: boolean,
  hasPlacement: boolean,
) {
  const isMenuResult = searchParams.has("menu_hash") || searchParams.has("show_recommend");
  return enabled && hasPlacement && isAdsterraContentPath(pathname) && !isMenuResult;
}
