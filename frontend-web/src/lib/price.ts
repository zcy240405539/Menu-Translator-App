const CURRENCY_SYMBOL = /\p{Sc}/u;

export function formatMenuPrice(price: string | number | null | undefined, currency?: string | null) {
  if (price === null || price === undefined || price === "") return "";

  const value = String(price).trim();
  const embeddedSymbol = Array.from(value).find((character) => CURRENCY_SYMBOL.test(character));
  const currencySymbol = Array.from(String(currency || "")).find((character) => CURRENCY_SYMBOL.test(character));
  const symbol = embeddedSymbol || currencySymbol;
  if (!symbol) return value;

  if (embeddedSymbol && value.indexOf(symbol) <= value.search(/\d/u)) return value;

  const amount = value.replace(symbol, "").trim();
  return amount ? `${symbol}${amount}` : value;
}
