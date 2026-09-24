import type { WebLanguageCode } from "@/lib/i18n";

export const SITE_URL = "https://aimenu.us.kg";
export const SEO_CONTENT_LAST_MODIFIED = new Date("2026-09-24T00:00:00Z");

export const SEO_LANGUAGES = [
  { code: "en", segment: "", hreflang: "en" },
  { code: "zh-cn", segment: "zh-cn", hreflang: "zh-Hans" },
  { code: "zh-Hant", segment: "zh-hant", hreflang: "zh-Hant" },
  { code: "es", segment: "es", hreflang: "es" },
  { code: "fr", segment: "fr", hreflang: "fr" },
  { code: "ja", segment: "ja", hreflang: "ja" },
  { code: "ko", segment: "ko", hreflang: "ko" },
  { code: "ru", segment: "ru", hreflang: "ru" },
  { code: "pt", segment: "pt", hreflang: "pt" },
  { code: "de", segment: "de", hreflang: "de" },
  { code: "it", segment: "it", hreflang: "it" },
  { code: "ar", segment: "ar", hreflang: "ar" },
] as const satisfies ReadonlyArray<{
  code: WebLanguageCode;
  segment: string;
  hreflang: string;
}>;

export const SEO_LOCALIZED_LANGUAGES = SEO_LANGUAGES.filter(({ code }) => code !== "en");

function normalizedPagePath(pathname: string) {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (path === "/") return path;
  return path.replace(/\/+$/, "");
}

export function languageFromPathSegment(segment?: string | null): WebLanguageCode | null {
  const normalized = String(segment || "").trim().toLowerCase();
  if (!normalized) return null;
  return SEO_LANGUAGES.find((language) => language.segment.toLowerCase() === normalized)?.code || null;
}

export function languageFromPathname(pathname: string): WebLanguageCode | null {
  const segment = normalizedPagePath(pathname).split("/").filter(Boolean)[0];
  return languageFromPathSegment(segment);
}

export function localizedPublicPath(pathname: string, language: WebLanguageCode) {
  const pagePath = normalizedPagePath(pathname);
  const locale = SEO_LANGUAGES.find(({ code }) => code === language) || SEO_LANGUAGES[0];
  if (!locale.segment) return pagePath;
  return pagePath === "/" ? `/${locale.segment}` : `/${locale.segment}${pagePath}`;
}

export function absoluteLocalizedUrl(pathname: string, language: WebLanguageCode) {
  const localizedPath = localizedPublicPath(pathname, language);
  return `${SITE_URL}${localizedPath === "/" ? "/" : `${localizedPath}/`}`;
}

export function localizedAlternates(pathname: string) {
  const languages = Object.fromEntries(
    SEO_LANGUAGES.map(({ code, hreflang }) => [hreflang, absoluteLocalizedUrl(pathname, code)]),
  );
  return { ...languages, "x-default": absoluteLocalizedUrl(pathname, "en") };
}

export function languageQuery(language: WebLanguageCode) {
  return language === "en" ? "" : `?lang=${encodeURIComponent(language)}`;
}
