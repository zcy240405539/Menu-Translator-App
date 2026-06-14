import { Platform } from "react-native";

function guessCurrencyOffline() {
  try {
    const locale = (
      (typeof Intl !== "undefined" && Intl.NumberFormat && Intl.NumberFormat().resolvedOptions().locale) ||
      ""
    ).toUpperCase();
    
    if (locale.includes("-CN") || locale === "ZH") {
      return "￥";
    }
    if (locale.includes("-GB")) {
      return "£";
    }
    if (
      locale.includes("-ES") ||
      locale.includes("-FR") ||
      locale.includes("-DE") ||
      locale.includes("-IT") ||
      locale.includes("-PT") ||
      locale.includes("-NL") ||
      locale.includes("-BE") ||
      locale.includes("-GR") ||
      locale.includes("-AT") ||
      locale.includes("-FI") ||
      locale.includes("-IE")
    ) {
      return "€";
    }
    
    const tz = (
      (typeof Intl !== "undefined" && Intl.DateTimeFormat && Intl.DateTimeFormat().resolvedOptions().timeZone) ||
      ""
    ).toLowerCase();
    
    if (tz.includes("shanghai") || tz.includes("chongqing") || tz.includes("harbin") || tz.includes("urumqi")) {
      return "￥";
    }
    if (tz.includes("london") || tz.includes("belfast") || tz.includes("europe/london")) {
      return "£";
    }
    if (
      tz.includes("paris") ||
      tz.includes("berlin") ||
      tz.includes("rome") ||
      tz.includes("madrid") ||
      tz.includes("amsterdam") ||
      tz.includes("brussels") ||
      tz.includes("vienna") ||
      tz.includes("lisbon") ||
      tz.includes("athens") ||
      tz.includes("helsinki") ||
      tz.includes("dublin")
    ) {
      return "€";
    }
  } catch (e) {
    // Fallback if Intl is not supported or throws
  }
  return "$";
}

let userCurrencySymbol = guessCurrencyOffline();

function normalizeLanguageCode(value) {
  return String(value || "").trim().toLowerCase();
}

export function isChineseLanguage(value) {
  const lang = normalizeLanguageCode(value);
  return lang === "zh" || lang === "cn" || lang.startsWith("zh-");
}

export function getCurrencySymbol(sourceLanguage) {
  return isChineseLanguage(sourceLanguage) ? "￥" : "$";
}

export async function detectUserCurrency() {
  if (Platform.OS === "web") {
    return userCurrencySymbol;
  }

  try {
    const response = await fetch("https://freeipapi.com/api/json");
    if (response.ok) {
      const data = await response.json();
      const countryCode = data.countryCode;
      if (countryCode === "CN") {
        userCurrencySymbol = "￥";
      } else if (["US", "CA", "AU", "NZ", "SG", "HK"].includes(countryCode)) {
        userCurrencySymbol = "$";
      } else if (["GB"].includes(countryCode)) {
        userCurrencySymbol = "£";
      } else if (["ES", "FR", "DE", "IT", "PT", "NL", "BE", "GR", "AT", "FI", "IE"].includes(countryCode)) {
        userCurrencySymbol = "€";
      } else {
        userCurrencySymbol = "$";
      }
    }
  } catch (error) {
    console.log("Failed to detect user currency by IP:", error);
  }
  return userCurrencySymbol;
}

export function getUserCurrencySymbol() {
  return userCurrencySymbol || "";
}

function normalizeCurrencySymbol(value) {
  const text = String(value || "").trim();
  if (!text) return "";

  if (/^(cny|rmb)$/i.test(text) || text === "元") {
    return "￥";
  }

  return text.replace(/¥/g, "￥");
}

let unitTranslations = [];

export function setUnitTranslations(translations) {
  if (Array.isArray(translations)) {
    unitTranslations = translations;
  }
}

function translateChinesePriceUnits(priceText, targetLanguage) {
  if (!targetLanguage || isChineseLanguage(targetLanguage)) {
    return priceText;
  }

  let result = String(priceText).replace(/／/g, "/");

  const targetLangCode = normalizeLanguageCode(targetLanguage).split("-")[0];

  const langTranslations = unitTranslations.filter(
    (t) => normalizeLanguageCode(t.target_lang) === targetLangCode
  );

  if (langTranslations.length > 0) {
    const sortedTrans = [...langTranslations].sort((a, b) => b.source_unit.length - a.source_unit.length);
    
    for (const t of sortedTrans) {
      const src = t.source_unit;
      const trans = t.translated_unit;
      const escapedSrc = src.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      
      const slashRegex = new RegExp(`\\/\\s*${escapedSrc}`, "g");
      result = result.replace(slashRegex, `/${trans}`);
      
      const perRegex = new RegExp(`每\\s*${escapedSrc}`, "g");
      result = result.replace(perRegex, `per ${trans}`);
    }
  } else {
    result = result
      .replace(/\/\s*份/g, "/serving")
      .replace(/\/\s*位/g, "/person")
      .replace(/\/\s*人/g, "/person")
      .replace(/\/\s*个/g, "/each")
      .replace(/\/\s*個/g, "/each")
      .replace(/\/\s*只/g, "/piece")
      .replace(/\/\s*隻/g, "/piece")
      .replace(/\/\s*条/g, "/piece")
      .replace(/\/\s*條/g, "/piece")
      .replace(/\/\s*碗/g, "/bowl")
      .replace(/\/\s*盘/g, "/plate")
      .replace(/\/\s*盤/g, "/plate")
      .replace(/\/\s*杯/g, "/cup")
      .replace(/\/\s*瓶/g, "/bottle")
      .replace(/\/\s*斤/g, "/jin")
      .replace(/\/\s*两/g, "/liang")
      .replace(/\/\s*兩/g, "/liang")
      .replace(/每\s*份/g, "per serving")
      .replace(/每\s*位/g, "per person")
      .replace(/每\s*人/g, "per person")
      .replace(/每\s*个/g, "each")
      .replace(/每\s*個/g, "each");
  }

  return result;
}

export function formatPrice(price, options = {}) {
  if (price === null || price === undefined || price === "") return "";

  const text = String(price).trim();
  if (!text) return "";
  const targetLanguage = options.targetLanguage || options.targetLang;

  // 1. If it already has currency symbols, normalize ¥ -> ￥ and return as is.
  if (/[￥¥$€£]/.test(text)) {
    return translateChinesePriceUnits(text.replace(/¥/g, "￥"), targetLanguage);
  }

  // 2. If it has explicit word-based currency code (like USD, CNY, etc.), keep it.
  if (/\b(usd|cad|aud|cny|rmb)\b/i.test(text)) {
    return translateChinesePriceUnits(text, targetLanguage);
  }

  // 3. If the menu explicitly uses 元, normalize it to ￥ while preserving units.
  if (/元/.test(text)) {
    const cleanNum = text.replace(/元/g, "").trim();
    return translateChinesePriceUnits(`￥${cleanNum}`, targetLanguage);
  }

  // 4. Otherwise, prepend menu currency if available, then source-language currency, then IP currency.
  const menuCurrency = normalizeCurrencySymbol(options.currency);
  if (menuCurrency) {
    return translateChinesePriceUnits(`${menuCurrency}${text}`, targetLanguage);
  }

  const sourceCurrency = options.sourceLanguage ? getCurrencySymbol(options.sourceLanguage) : "";
  if (sourceCurrency) {
    return translateChinesePriceUnits(`${sourceCurrency}${text}`, targetLanguage);
  }

  const ipCurrency = userCurrencySymbol;
  if (ipCurrency) {
    return translateChinesePriceUnits(`${ipCurrency}${text}`, targetLanguage);
  }

  // 5. If no location/IP or menu currency could be retrieved, default to not displaying any currency symbol.
  return translateChinesePriceUnits(text, targetLanguage);
}

export function extractPriceNumber(price) {
  if (price === null || price === undefined || price === "") return null;

  const text = String(price)
    .replace(/[￥¥$€£]/g, "")
    .replace(/\b(usd|cad|aud|cny|rmb)\b/gi, "")
    .replace(/元/g, "")
    .replace(/,/g, " ");

  const match = text.match(/\d+(?:\.\d+)?/);
  if (!match) return null;

  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}
