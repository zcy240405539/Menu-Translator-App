export const ADSTERRA_CONTENT_PATHS = [
  "/",
  "/how-it-works",
  "/menu-translation-guide",
  "/menu-examples",
  "/supported-languages",
  "/about",
  "/contact",
  "/privacy-policy",
  "/terms-of-service",
  "/login",
  "/register",
  "/settings",
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
  enabled: boolean,
  hasPlacement: boolean,
) {
  return enabled && hasPlacement && isAdsterraContentPath(pathname);
}
