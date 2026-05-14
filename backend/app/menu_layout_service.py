import re

def is_probable_section_heading(line: dict) -> bool:
    text = (line.get("text") or "").strip()
    if not text:
        return False

    price_text = line.get("price_text")
    role = line.get("line_role")
    font = line.get("font_size_hint")

    alpha_chars = [c for c in text if c.isalpha()]
    upper_ratio = (
        sum(c.isupper() for c in alpha_chars) / max(1, len(alpha_chars))
    )

    return (
        role == "section_heading"
        or (
            price_text in [None, ""]
            and font in ["large", "xlarge"]
            and upper_ratio >= 0.70
            and len(text.split()) <= 5
        )
    )


def is_probable_dish(line: dict) -> bool:
    text = (line.get("text") or "").strip()
    if not text:
        return False

    role = line.get("line_role")
    price_text = line.get("price_text")

    return role == "dish_name" or price_text not in [None, ""]


def split_dish_name_and_description(text: str) -> tuple[str, str]:
    text = (text or "").strip()

    if not text:
        return "", ""

    # 去 OCR 垃圾
    text = re.sub(r"\bg/m\b", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\bMkt\b", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\bMkr\b", "", text, flags=re.IGNORECASE)

    text = re.sub(r"\s+", " ", text).strip()

    # 去末尾价格
    text = re.sub(r"\s+\d{1,3}$", "", text).strip()

    words = text.split()

    split_idx = None

    for i, word in enumerate(words):
        clean = re.sub(r"[^A-Za-z]", "", word)

        if not clean:
            continue

        # description 开始
        # 出现 Title Case / lowercase
        if not clean.isupper():
            split_idx = i
            break

    if split_idx is None:
        return text.strip(), ""

    dish_name = " ".join(words[:split_idx]).strip()
    description = " ".join(words[split_idx:]).strip()

    return dish_name, description


def build_menu_items_from_layout_lines(
    layout_lines: list,
    source_language: str,
    target_lang: str,
    get_or_create_category_func,
    db,
) -> list:
    items = []
    current_category = None

    sorted_lines = sorted(
        layout_lines,
        key=lambda x: (x.get("y_order", 0), x.get("x_order", 0)),
    )

    for line in sorted_lines:
        if is_probable_section_heading(line):
            clean_heading = re.sub(r"\bg/m\b", "", line.get("text", ""), flags=re.IGNORECASE)
            clean_heading = clean_heading.strip()
            current_category = get_or_create_category_func(
                db=db,
                original_label=line.get("text", ""),
                source_language=source_language,
                target_language=target_lang,
            )
            continue

        if not is_probable_dish(line):
            continue

        raw_text = (line.get("text") or "").strip()

        # 纯数字
        if re.fullmatch(r"\d{1,3}", raw_text):
            continue

        # 太短
        if len(raw_text) < 3:
            continue

        category_key = current_category.normalized_key if current_category else "other"
        section_original = current_category.original_label if current_category else ""
        section_translated = current_category.translated_label if current_category else ""

        raw_text = line.get("text", "")
        dish_name, parsed_description = split_dish_name_and_description(
            raw_text
        )

        description_original = parsed_description

        if line.get("description_text"):
            if len(line["description_text"]) > len(parsed_description):
                description_original = line["description_text"]

        item = {
            "id": f"dish_{len(items) + 1:03d}",
            "original_name": dish_name,
            "description_original": description_original,
            "price": line.get("price_text"),
            "category": category_key,
            "section_heading_original": section_original,
            "section_heading_translated": section_translated,
            "source_language": source_language,
        }

        items.append(item)

    return items