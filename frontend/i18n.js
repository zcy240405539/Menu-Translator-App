import ar from "./locales/ar.json";
import de from "./locales/de.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import it from "./locales/it.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import pt from "./locales/pt.json";
import ru from "./locales/ru.json";
import zh from "./locales/zh.json";
import zhHant from "./locales/zh-Hant.json";

const STORAGE_KEY = "menu_app_language";

export const DEFAULT_LANGUAGE = "zh";
export const DEFAULT_SOURCE_LANGUAGE = "en";

export const LANGUAGES = [
  { code: "en", flag: "🇺🇸" },
  { code: "zh", flag: "🇨🇳" },
  { code: "zh-Hant", flag: "🇹🇼" },
  { code: "es", flag: "🇪🇸" },
  { code: "fr", flag: "🇫🇷" },
  { code: "ja", flag: "🇯🇵" },
  { code: "ko", flag: "🇰🇷" },
  { code: "ru", flag: "🇷🇺" },
  { code: "pt", flag: "🇵🇹" },
  { code: "de", flag: "🇩🇪" },
  { code: "it", flag: "🇮🇹" },
  { code: "ar", flag: "🇸🇦" },
];

export const SOURCE_LANGUAGES = [{ code: "auto", flag: "🌐" }, ...LANGUAGES];

export const translations = {
  ar,
  de,
  en,
  es,
  fr,
  it,
  ja,
  ko,
  pt,
  ru,
  zh,
  "zh-Hant": zhHant,
};

export function normalizeLanguage(lang) {
  const normalized = String(lang || "").trim().replaceAll("_", "-").toLowerCase();
  if (normalized === "zh" || normalized === "zh-cn" || normalized === "zh-hans") return "zh";
  if (["zh-tw", "zh-hk", "zh-hant"].includes(normalized)) return "zh-Hant";
  const primary = normalized.split("-", 1)[0];
  return LANGUAGES.some(({ code }) => code === primary) ? primary : DEFAULT_LANGUAGE;
}

export function getText(lang) {
  return translations[normalizeLanguage(lang)];
}

export function getLanguageLabel(uiLang, languageCode) {
  const text = getText(uiLang);
  const normalized = languageCode === "auto" ? "auto" : normalizeLanguage(languageCode);
  return text.languageNames[normalized];
}

export function isChineseLanguage(lang) {
  return normalizeLanguage(lang) === "zh" || normalizeLanguage(lang) === "zh-Hant";
}

export function getUrlLangParam(langCode) {
  const normalized = normalizeLanguage(langCode);
  if (normalized === "zh") return "zh-cn";
  if (normalized === "zh-Hant") return "zh-tw";
  return normalized;
}

export function mapUrlLangToInternal(langParam) {
  if (!langParam) return null;
  return normalizeLanguage(langParam);
}

export function getInitialLanguage() {
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return normalizeLanguage(saved);
  }

  const browserLang = typeof navigator !== "undefined" ? navigator.language : null;
  return normalizeLanguage(browserLang);
}

export function hasSavedLanguage() {
  return typeof localStorage !== "undefined" && !!localStorage.getItem(STORAGE_KEY);
}

export function saveLanguage(lang) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, normalizeLanguage(lang));
  }
}

export function t(lang, key) {
  let value = getText(lang);
  for (const part of key.split(".")) value = value?.[part];
  return value ?? key;
}
