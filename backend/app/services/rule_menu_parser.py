from __future__ import annotations

import re
from functools import lru_cache

from app.core.i18n_service import normalize_lang
from app.language_modules import get_language_profile


PRICE_NUMBER_PATTERN = r"(?:\d{1,3}(?:[.,\s٬]\d{3})+|\d{1,7})(?:[.,٫](?:\d{1,2}|-))?"
COMMON_CURRENCY_MARKERS = ("$", "€", "£", "¥", "￥", "₩", "₽")
HEADING_RE = re.compile(r"^(?P<marks>#{1,6})\s+(?P<text>.+)$")
BULLET_RE = re.compile(r"^\s*(?:[-*•]\s+|\d+[.)]\s+)")
HTML_COMMENT_RE = re.compile(r"<!--.*?-->")
SIZE_HEADER_RE = re.compile(r"\b\d+\s*oz\b.*\b\d+\s*oz\b", re.IGNORECASE)
TIME_RE = re.compile(r"\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b", re.IGNORECASE)
NUMBERED_ITEM_RE = re.compile(r"#\s*(?P<code>\d+(?:\.\d+)?)\s+")
INLINE_DECIMAL_PRICE_RE = re.compile(
    r"^(?P<body>.*?)(?:\s*[-–]\s*)?(?P<price>\d{1,3}\.\d{2})(?:\s|,|$)"
)
YEAR_ONLY_RE = re.compile(r"^(?:19|20)\d{2}$")
SIZE_ONLY_ITEM_RE = re.compile(r"^\d+(?:\.\d+)?\s*(?:oz|ml|cl|l)$", re.IGNORECASE)

NOISE_FRAGMENTS = (
    "source page:",
    "followed menu link:",
    "link to ",
    "reservation",
    "login",
    "bag ",
    "cart",
    "homepage",
    "menus are seasonal",
    "subject to change",
    "instagram",
    "facebook",
    "copyright",
)
NON_MENU_HEADINGS = {
    "menus",
    "menu",
    "page 1",
    "page 2",
    "page 3",
    "page 4",
    "extracted menu text",
    "document ai extracted menu text",
    "google cloud vision pdf menu text",
    "extracted pdf menu text",
    "pdf text layer cross-check",
}


@lru_cache(maxsize=16)
def _price_regexes(source_lang: str):
    profile = get_language_profile(source_lang)
    markers = sorted(
        {*COMMON_CURRENCY_MARKERS, *profile.currency_markers},
        key=len,
        reverse=True,
    )
    currency_pattern = "(?:" + "|".join(re.escape(marker) for marker in markers) + ")"
    price_value_pattern = (
        rf"(?:{currency_pattern}\s*)?{PRICE_NUMBER_PATTERN}(?:\s*{currency_pattern})?"
    )
    price_range_pattern = (
        rf"{price_value_pattern}(?:\s*[-–—]\s*{price_value_pattern})?"
    )
    return (
        re.compile(
            rf"^\s*{price_range_pattern}(?:\s+{PRICE_NUMBER_PATTERN}){{0,3}}\s*$",
            re.IGNORECASE,
        ),
        re.compile(
            rf"^(?P<body>.+?)\s*(?:\||\.{{2,}}|[-–])?\s*"
            rf"(?P<price>{price_range_pattern}(?:\s+{PRICE_NUMBER_PATTERN}){{0,3}})\s*$",
            re.IGNORECASE,
        ),
        re.compile(
            rf"^(?P<label>.+?)\s+(?P<price>{price_range_pattern})$",
            re.IGNORECASE,
        ),
    )


def _clean_line(raw_line: str) -> tuple[int, str]:
    line = HTML_COMMENT_RE.sub("", raw_line or "").strip()
    if not line:
        return 0, ""

    heading = HEADING_RE.match(line)
    if heading:
        return len(heading.group("marks")), heading.group("text").strip()

    return 0, BULLET_RE.sub("", line).strip()


def _normalize_text_key(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip().lower())


def _clean_price(price: str | None) -> str | None:
    if not price:
        return None
    value = re.sub(r"\s+", " ", price.strip())
    value = value.replace("￥", "¥")
    if "," in value and "." not in value and len(value.rsplit(",", 1)[-1]) == 2:
        value = value.replace(",", ".")
    return value


def _is_price_only(text: str, source_lang: str) -> bool:
    price_only_re, _, _ = _price_regexes(source_lang)
    return bool(price_only_re.fullmatch(text or "")) and not SIZE_HEADER_RE.search(text or "")


def _split_section_price(text: str, source_lang: str) -> tuple[str, str | None]:
    _, _, section_price_re = _price_regexes(source_lang)
    match = section_price_re.fullmatch(text or "")
    if not match:
        return text.strip(), None
    label = match.group("label").strip(" -–:|")
    if not label or not any(char.isalpha() for char in label) or _is_price_only(label, source_lang):
        return text.strip(), None
    return label, _clean_price(match.group("price"))


def _split_trailing_price(text: str, source_lang: str) -> tuple[str, str | None]:
    if SIZE_HEADER_RE.search(text or ""):
        return text.strip(), None
    if "|" in text:
        left, right = text.rsplit("|", 1)
        if _is_price_only(right.strip(), source_lang):
            return left.strip(), _clean_price(right)

    _, trailing_price_re, _ = _price_regexes(source_lang)
    match = trailing_price_re.fullmatch(text or "")
    if not match:
        return text.strip(), None
    body = match.group("body").strip(" -–:|.")
    price = _clean_price(match.group("price"))
    if not body or len(body) < 2:
        return text.strip(), None
    return body, price


def _split_name_description(text: str) -> tuple[str, str]:
    text = re.sub(r"\s+", " ", (text or "").strip(" -–:|."))
    if not text:
        return "", ""

    tokens = text.split()
    for index, token in enumerate(tokens[1:], start=1):
        letters = re.sub(r"[^A-Za-zÀ-ÿ]", "", token)
        prefix = " ".join(tokens[:index])
        prefix_letters = re.sub(r"[^A-Za-zÀ-ÿ]", "", prefix)
        prefix_is_upper = bool(prefix_letters) and not re.search(r"[a-zà-ÿ]", prefix_letters)
        if prefix_is_upper and letters and re.search(r"[a-zà-ÿ]", letters):
            name = " ".join(tokens[:index]).strip(" -–:|.")
            description = " ".join(tokens[index:]).strip(" -–:|.")
            if name:
                return name, description
    return text, ""


def _split_comma_name_description(text: str) -> tuple[str, str]:
    text = re.sub(r"\s+", " ", (text or "").strip(" -–:|.,"))
    if "," not in text:
        return _split_name_description(text)
    name, description = text.split(",", 1)
    return name.strip(" -–:|."), description.strip(" -–:|.")


def _extract_numbered_items(text: str, source_lang: str) -> list[dict]:
    matches = list(NUMBERED_ITEM_RE.finditer(text or ""))
    if not matches:
        return []

    items = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        chunk = text[match.end() : end].strip(" -–:|.,")
        if not chunk:
            continue

        price = None
        price_match = INLINE_DECIMAL_PRICE_RE.search(chunk)
        if price_match:
            chunk = price_match.group("body").strip(" -–:|.,")
            price = _clean_price(price_match.group("price"))

        name, description = _split_comma_name_description(chunk)
        if not name or _is_price_only(name, source_lang):
            continue
        items.append(
            {
                "original_name": f"#{match.group('code')} {name}",
                "price": price,
                "description_original": description,
            }
        )
    return items


def _looks_like_noise(text: str) -> bool:
    key = _normalize_text_key(text)
    if not key:
        return True
    if key in NON_MENU_HEADINGS:
        return True
    if any(fragment in key for fragment in NOISE_FRAGMENTS):
        return True
    return bool(TIME_RE.search(key))


def _is_probable_description(text: str) -> bool:
    stripped = (text or "").strip()
    if not stripped:
        return False
    return stripped[0].islower()


def _looks_like_section(
    text: str,
    heading_level: int,
    next_text: str,
    section_terms: set[str],
    has_current_section: bool,
    has_section_price: bool,
    source_lang: str,
) -> bool:
    key = _normalize_text_key(text)
    if not key or key in NON_MENU_HEADINGS:
        return False
    if heading_level >= 2 and has_current_section:
        return False
    if key in section_terms:
        return True
    if heading_level == 1 and len(text.split()) <= 8:
        return True
    if has_section_price and key in section_terms:
        return True
    if (
        next_text
        and _is_price_only(next_text, source_lang)
        and len(text.split()) <= 5
        and not text[:1].islower()
        and "," not in text
        and not has_current_section
    ):
        return True
    return False


def _normalized_category(section: str) -> str:
    category = re.sub(r"[^\w]+", "_", section.strip().lower(), flags=re.UNICODE).strip("_")
    return category or "menu"


def is_rule_menu_result_reliable(result: dict) -> bool:
    items = result.get("menu_items") if isinstance(result, dict) else None
    if not isinstance(items, list) or not items:
        return False

    year_prices = 0
    signatures = set()
    duplicate_count = 0
    for item in items:
        if not isinstance(item, dict):
            return False
        price = re.sub(r"\s+", "", str(item.get("price") or ""))
        if YEAR_ONLY_RE.fullmatch(price):
            year_prices += 1

        name = str(item.get("original_name") or "").strip()
        if not name or SIZE_ONLY_ITEM_RE.fullmatch(name):
            return False
        section = str(item.get("section_heading_original") or item.get("category") or "")
        signature = re.sub(r"[^\w]+", " ", f"{section} {name}".lower(), flags=re.UNICODE).strip()
        if signature in signatures:
            duplicate_count += 1
        signatures.add(signature)

    if year_prices >= 2:
        return False
    return duplicate_count / len(items) <= 0.15


def parse_menu_markdown_with_rules(
    extracted_markdown: str,
    target_lang: str = "zh",
    source_lang: str = "en",
) -> dict:
    target_lang = normalize_lang(target_lang, "zh")
    source_lang = normalize_lang(source_lang, "en")
    profile = get_language_profile(source_lang)
    section_terms = {_normalize_text_key(term) for term in profile.section_terms}

    rows = []
    for raw_line in (extracted_markdown or "").splitlines():
        heading_level, text = _clean_line(raw_line)
        if text and not _looks_like_noise(text):
            rows.append((heading_level, text))

    items: list[dict] = []
    current_section = ""
    current_default_price: str | None = None
    pending: dict | None = None
    numbered_mode = False

    def finalize_pending() -> None:
        nonlocal pending
        if not pending:
            return
        if not pending.get("price") and current_default_price:
            pending["price"] = current_default_price
        pending["id"] = f"dish_{len(items) + 1:03d}"
        pending["category"] = _normalized_category(pending.get("section_heading_original") or current_section)
        items.append(pending)
        pending = None

    for index, (heading_level, text) in enumerate(rows):
        next_text = rows[index + 1][1] if index + 1 < len(rows) else ""
        numbered_items = _extract_numbered_items(text, source_lang)
        if numbered_items:
            numbered_mode = True
            finalize_pending()
            if not current_section:
                current_section = "Menu"
            for numbered_item in numbered_items:
                pending = {
                    "original_name": numbered_item["original_name"],
                    "translated_name": "",
                    "price": numbered_item.get("price"),
                    "section_heading_original": current_section,
                    "section_heading_translated": "",
                    "description_original": numbered_item.get("description_original") or "",
                    "description": "",
                    "ingredients": [],
                    "allergens": [],
                    "spicy_level": 0,
                    "image_prompt": "",
                    "confidence": 0.65,
                    "source_language": source_lang,
                }
                finalize_pending()
            continue

        if numbered_mode and heading_level == 0:
            continue

        if _is_price_only(text, source_lang):
            price = _clean_price(text)
            if pending:
                pending["price"] = price
                finalize_pending()
            elif current_section:
                current_default_price = price
            continue

        section_label, section_price = _split_section_price(text, source_lang)
        if _looks_like_section(
            section_label,
            heading_level,
            next_text,
            section_terms,
            bool(current_section),
            section_price is not None,
            source_lang,
        ):
            finalize_pending()
            current_section = section_label
            current_default_price = section_price
            continue

        if not current_section:
            continue

        if pending and _is_probable_description(text):
            pending["description_original"] = " ".join(
                part for part in [pending.get("description_original"), text] if part
            )
            continue

        body, price = _split_trailing_price(text, source_lang)
        name, description = _split_name_description(body)
        if not name or _is_price_only(name, source_lang) or _looks_like_noise(name):
            continue

        finalize_pending()
        pending = {
            "original_name": name,
            "translated_name": "",
            "price": price,
            "section_heading_original": current_section,
            "section_heading_translated": "",
            "description_original": description,
            "description": "",
            "ingredients": [],
            "allergens": [],
            "spicy_level": 0,
            "image_prompt": "",
            "confidence": 0.7,
            "source_language": source_lang,
        }
        if price:
            finalize_pending()

    finalize_pending()

    return {
        "source_language": source_lang,
        "target_language": target_lang,
        "restaurant_type": "",
        "business_name": None,
        "currency": None,
        "business_description": {},
        "menu_items": items,
        "analysis_provider": "rule_fallback",
        "analysis_model": "markdown_rules",
        "analysis_prompt": "rule_fallback",
    }
