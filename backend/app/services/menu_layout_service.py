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


from concurrent.futures import ThreadPoolExecutor
from statistics import median


def order_page_blocks(blocks):
    """Recover column reading order from repeated left edges of long text lines."""
    if not blocks:
        return []
    positioned = [b for b in blocks if all(isinstance(b.get(k), (int, float))
                  for k in ("x_min", "x_max", "y_min"))]
    if len(positioned) != len(blocks):
        return blocks
    width = max(b["x_max"] for b in positioned) - min(b["x_min"] for b in positioned)
    anchors = sorted([b for b in positioned if b["x_max"] - b["x_min"] > width * 0.18],
                     key=lambda b: b["x_min"])
    groups = []
    for block in anchors:
        if not groups or block["x_min"] - groups[-1][-1]["x_min"] > width * 0.15:
            groups.append([])
        groups[-1].append(block)
    groups = [group for group in groups if len(group) >= 4]
    if len(groups) < 2:
        return sorted(blocks, key=lambda b: (b["y_min"], b["x_min"]))
    boundaries = [(median(b["x_max"] for b in left) + median(b["x_min"] for b in right)) / 2
                  for left, right in zip(groups, groups[1:])]
    ordered = [{**block, "column": 1 + sum((block["x_min"] + block["x_max"]) / 2 > edge
                                           for edge in boundaries)} for block in blocks]
    return sorted(ordered, key=lambda b: (b["column"], b["y_min"], b["x_min"]))


def parse_menu_layout_pages(ocr_blocks, parse_page):
    """Parse pages independently so coordinates and output budgets cannot overlap."""
    pages = {}
    for block in ocr_blocks:
        pages.setdefault(block.get("page", block.get("page_num", 1)), []).append(block)
    if not pages:
        raise ValueError("No readable menu layout was extracted.")

    def parse(entry):
        page, blocks = entry
        result = parse_page(order_page_blocks(blocks))
        if not isinstance(result, dict) or not isinstance(result.get("menu_items"), list):
            raise ValueError(f"Invalid menu layout response for page {page}.")
        return page, result

    # Bound concurrent model calls and preserve input page order, even if a later page finishes first.
    with ThreadPoolExecutor(max_workers=min(3, len(pages))) as executor:
        results = list(executor.map(parse, pages.items()))
    merged = dict(results[0][1])
    merged["menu_items"] = []
    merged["page_analysis"] = []
    for page, result in results:
        for key in ("business_name", "currency", "restaurant_type"):
            if not merged.get(key) and result.get(key):
                merged[key] = result[key]
        merged["page_analysis"].append({
            "page": page,
            "items": len(result["menu_items"]),
            "provider": result.get("_structure_provider_used"),
        })
        for item in result["menu_items"]:
            merged["menu_items"].append({
                **item,
                "id": f"dish_{len(merged['menu_items']) + 1:03d}",
                "source_page": page,
            })
    return merged
