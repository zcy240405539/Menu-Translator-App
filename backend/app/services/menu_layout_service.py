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
