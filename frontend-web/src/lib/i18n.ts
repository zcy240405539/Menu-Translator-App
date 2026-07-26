import ar from "@/locales/ar.json";
import de from "@/locales/de.json";
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import fr from "@/locales/fr.json";
import it from "@/locales/it.json";
import ja from "@/locales/ja.json";
import ko from "@/locales/ko.json";
import pt from "@/locales/pt.json";
import ru from "@/locales/ru.json";
import zhCn from "@/locales/zh-cn.json";
import zhHant from "@/locales/zh-Hant.json";

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

type Catalog = typeof en;

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

export const webText: Record<WebLanguageCode, Catalog> = {
  ar: ar as Catalog,
  de: de as Catalog,
  en,
  es: es as Catalog,
  fr: fr as Catalog,
  it: it as Catalog,
  ja: ja as Catalog,
  ko: ko as Catalog,
  pt: pt as Catalog,
  ru: ru as Catalog,
  "zh-cn": zhCn as Catalog,
  "zh-Hant": zhHant as Catalog,
};

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
  return webText[normalizeLanguage(lang)];
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
