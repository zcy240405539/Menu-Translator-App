from collections import Counter
import unicodedata


def detect_menu_currency_symbol(source_text: str | None) -> str | None:
    text = str(source_text or "")
    symbols: Counter[str] = Counter()
    for index, character in enumerate(text):
        if unicodedata.category(character) != "Sc":
            continue
        nearby = text[max(0, index - 8):index + 9]
        if any(value.isdigit() for value in nearby):
            symbols[character] += 1
    return symbols.most_common(1)[0][0] if symbols else None


def apply_menu_currency_symbol(result: object, source_text: str | None) -> object:
    if not isinstance(result, dict):
        return result
    existing = str(result.get("currency") or "").strip()
    if any(unicodedata.category(character) == "Sc" for character in existing):
        return result
    symbol = detect_menu_currency_symbol(source_text)
    if symbol:
        result["currency"] = symbol
    return result
