export const ADSTERRA_CONTENT_PATHS = [
  "/",
  "/how-it-works",
  "/menu-translation-guide",
  "/menu-examples",
  "/supported-languages",
  "/about",
] as const;

const ADSTERRA_CONTENT_PATH_SET = new Set<string>(ADSTERRA_CONTENT_PATHS);

export const ADSTERRA_BLOCKED_PATHS = [
  "/download",
  "/history",
  "/cart",
  "/account-deletion",
  "/ad-frame",
] as const;

const ADSTERRA_BLOCKED_PATH_SET = new Set<string>(ADSTERRA_BLOCKED_PATHS);

function normalizePathname(pathname: string) {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "");
}

export function isAdsterraContentPath(pathname: string) {
  return ADSTERRA_CONTENT_PATH_SET.has(normalizePathname(pathname));
}

export function shouldLoadAdsterra(
  pathname: string,
  enabled: boolean,
  hasPlacement: boolean,
) {
  return enabled && hasPlacement && !ADSTERRA_BLOCKED_PATH_SET.has(normalizePathname(pathname));
}
