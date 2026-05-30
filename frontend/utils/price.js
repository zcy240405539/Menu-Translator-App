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

export function formatPrice(price, options = {}) {
  if (price === null || price === undefined || price === "") return "";

  const text = String(price).trim();
  if (!text) return "";

  if (/[￥¥$€£]/.test(text)) {
    const normalized = text.replace(/^¥/, "￥");
    return isChineseLanguage(options.sourceLanguage)
      ? normalized.replace(/^\s*\$/, "￥")
      : normalized;
  }

  if (/\b(usd|cad|aud|cny|rmb)\b/i.test(text)) {
    return text;
  }

  if (/元/.test(text)) {
    return `￥${text}`;
  }

  return `${getCurrencySymbol(options.sourceLanguage)}${text}`;
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
