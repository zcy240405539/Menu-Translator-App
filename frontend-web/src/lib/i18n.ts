import en from "@/locales/en.json";

export type WebLanguageCode =
  | "en"
  | "zh-cn"
  | "zh-Hant"
  | "es"
  | "fr"
  | "ja"
  | "ko"
  | "ru"
  | "pt"
  | "de"
  | "it"
  | "ar";

export type Catalog = typeof en;

const STORAGE_KEY = "menu_app_language";

export const DEFAULT_LANGUAGE: WebLanguageCode = "en";
export const LANGUAGE_CHANGE_EVENT = "menu-app-language-change";

export const LANGUAGES: { code: WebLanguageCode }[] = [
  { code: "en" },
  { code: "zh-cn" },
  { code: "zh-Hant" },
  { code: "es" },
  { code: "fr" },
  { code: "ja" },
  { code: "ko" },
  { code: "ru" },
  { code: "pt" },
  { code: "de" },
  { code: "it" },
  { code: "ar" },
];

export const SOURCE_LANGUAGES = [{ code: "auto" as const }, ...LANGUAGES];

const catalogCache: Partial<Record<WebLanguageCode, Catalog>> = { en };
const catalogLoaders: Record<Exclude<WebLanguageCode, "en">, () => Promise<Catalog>> = {
  ar: () => import("@/locales/ar.json").then(({ default: catalog }) => catalog as Catalog),
  de: () => import("@/locales/de.json").then(({ default: catalog }) => catalog as Catalog),
  es: () => import("@/locales/es.json").then(({ default: catalog }) => catalog as Catalog),
  fr: () => import("@/locales/fr.json").then(({ default: catalog }) => catalog as Catalog),
  it: () => import("@/locales/it.json").then(({ default: catalog }) => catalog as Catalog),
  ja: () => import("@/locales/ja.json").then(({ default: catalog }) => catalog as Catalog),
  ko: () => import("@/locales/ko.json").then(({ default: catalog }) => catalog as Catalog),
  pt: () => import("@/locales/pt.json").then(({ default: catalog }) => catalog as Catalog),
  ru: () => import("@/locales/ru.json").then(({ default: catalog }) => catalog as Catalog),
  "zh-cn": () => import("@/locales/zh-cn.json").then(({ default: catalog }) => catalog as Catalog),
  "zh-Hant": () => import("@/locales/zh-Hant.json").then(({ default: catalog }) => catalog as Catalog),
};

const catalogPromises: Partial<Record<WebLanguageCode, Promise<Catalog>>> = {};

export function normalizeLanguage(lang?: string | null): WebLanguageCode {
  const normalized = String(lang || "").trim().replaceAll("_", "-").toLowerCase();
  if (normalized === "zh" || normalized === "zh-cn" || normalized === "zh-hans") return "zh-cn";
  if (["zh-tw", "zh-hk", "zh-hant"].includes(normalized)) return "zh-Hant";
  const primary = normalized.split("-", 1)[0] as WebLanguageCode;
  return LANGUAGES.some(({ code }) => code === primary) ? primary : DEFAULT_LANGUAGE;
}

export function toBackendLanguage(lang?: string | null) {
  const value = String(lang || "").trim();
  if (!value || value.toLowerCase() === "auto") return "auto";
  const normalized = normalizeLanguage(value);
  return normalized === "zh-cn" ? "zh" : normalized;
}

export function getInitialLanguage(): WebLanguageCode {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved) return normalizeLanguage(saved);
  return normalizeLanguage(window.navigator.language);
}

export function getPageLanguage(): WebLanguageCode {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  return normalizeLanguage(new URLSearchParams(window.location.search).get("lang") || getInitialLanguage());
}

export function saveLanguage(lang: WebLanguageCode) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, lang);
    window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGE_EVENT, { detail: lang }));
  }
}

export function replacePageLanguage(lang: string): WebLanguageCode {
  const normalized = normalizeLanguage(lang);
  saveLanguage(normalized);
  const url = new URL(window.location.href);
  url.searchParams.set("lang", normalized);
  window.history.replaceState({}, "", url.toString());
  return normalized;
}

export function htmlLanguage(lang: WebLanguageCode) {
  if (lang === "zh-cn") return "zh-CN";
  return lang;
}

export function applyDocumentLanguage(lang: WebLanguageCode) {
  if (typeof document !== "undefined") {
    document.documentElement.lang = htmlLanguage(lang);
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }
}

export function getText(lang: WebLanguageCode | string) {
  return catalogCache[normalizeLanguage(lang)] || en;
}

export function loadText(lang: WebLanguageCode | string): Promise<Catalog> {
  const normalized = normalizeLanguage(lang);
  const cached = catalogCache[normalized];
  if (cached) return Promise.resolve(cached);

  const pending = catalogPromises[normalized];
  if (pending) return pending;

  const promise = catalogLoaders[normalized as Exclude<WebLanguageCode, "en">]()
    .then((catalog) => {
      catalogCache[normalized] = catalog;
      return catalog;
    })
    .finally(() => {
      delete catalogPromises[normalized];
    });
  catalogPromises[normalized] = promise;
  return promise;
}

export function languageLabel(uiLang: WebLanguageCode, lang: string) {
  return getText(uiLang).languageNames[normalizeLanguage(lang)];
}

export function languageShortLabel(uiLang: WebLanguageCode, lang: string) {
  const normalized = normalizeLanguage(lang);
  return getText(uiLang).languageShortNames[normalized as "zh-cn" | "zh-Hant"]
    || languageLabel(uiLang, normalized);
}

export function sourceLanguageLabel(uiLang: WebLanguageCode, lang: string, compact = false) {
  if (lang === "auto") return getText(uiLang).analyzer.autoDetect;
  return compact ? languageShortLabel(uiLang, lang) : languageLabel(uiLang, lang);
}
