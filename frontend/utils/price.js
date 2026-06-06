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

export function formatPrice(price, options = {}) {
  if (price === null || price === undefined || price === "") return "";

  const text = String(price).trim();
  if (!text) return "";

  // 1. If it already has currency symbols, normalize ¥ -> ￥ and return as is.
  if (/[￥¥$€£]/.test(text)) {
    return text.replace(/¥/g, "￥");
  }

  // 2. If it has explicit word-based currency code (like USD, CNY, etc.), keep it.
  if (/\b(usd|cad|aud|cny|rmb)\b/i.test(text)) {
    return text;
  }

  // 3. 如果菜单上明确写了15元，再转换为￥
  if (/元/.test(text)) {
    const cleanNum = text.replace(/元/g, "").trim();
    return `￥${cleanNum}`;
  }

  // 4. Otherwise, prepend menu currency if available, then IP currency, then nothing.
  const menuCurrency = options.currency || null;
  if (menuCurrency) {
    return `${menuCurrency}${text}`;
  }

  const ipCurrency = userCurrencySymbol;
  if (ipCurrency) {
    return `${ipCurrency}${text}`;
  }

  // 5. If no location/IP or menu currency could be retrieved, default to not displaying any currency symbol.
  return text;
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
