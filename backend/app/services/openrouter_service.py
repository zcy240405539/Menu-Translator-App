import json
import re
import requests
import base64
import os
import time
from pathlib import Path
from app.core.config import OPENROUTER_API_KEY, OPENROUTER_MODEL, OPENROUTER_VISION_MODEL
OPENROUTER_LAYOUT_MODEL = os.getenv("OPENROUTER_LAYOUT_MODEL", "google/gemini-2.5-flash-lite")
OPENROUTER_DETAIL_MODEL = os.getenv("OPENROUTER_DETAIL_MODEL", OPENROUTER_LAYOUT_MODEL)
OPENROUTER_LAYOUT_MAX_TOKENS = int(os.getenv("OPENROUTER_LAYOUT_MAX_TOKENS", "4500"))
OPENROUTER_VISION_MAX_TOKENS = int(os.getenv("OPENROUTER_VISION_MAX_TOKENS", "2500"))
OPENROUTER_LAYOUT_TIMEOUT = int(os.getenv("OPENROUTER_LAYOUT_TIMEOUT", "45"))
OPENROUTER_VISION_TIMEOUT = int(os.getenv("OPENROUTER_VISION_TIMEOUT", "45"))
OPENROUTER_MAX_RETRIES = max(1, int(os.getenv("OPENROUTER_MAX_RETRIES", "2")))
USE_FAST_MENU_PROMPT = os.getenv("OPENROUTER_USE_FAST_MENU_PROMPT", "true").lower() in {
    "1",
    "true",
    "yes",
}
VISION_FALLBACK_MODELS = [
    model.strip()
    for model in (
        os.getenv(
            "OPENROUTER_VISION_FALLBACK_MODELS",
            f"{OPENROUTER_VISION_MODEL},google/gemini-2.5-flash-lite",
        )
    ).split(",")
    if model.strip()
]
from app.core.i18n_service import get_language_name, normalize_lang
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


# Translate category labels
def call_openrouter_translate_category_labels(
    labels: list[str],
    target_lang: str = "zh",
    source_lang: str = "en",
) -> dict:
    target_lang = normalize_lang(target_lang, "zh")
    source_lang = normalize_lang(source_lang, "en")

    target_language_name = get_language_name(target_lang)
    source_language_name = get_language_name(source_lang)

    system_prompt = f"""
You are a professional menu section heading translator.

Translate restaurant menu section headings from {source_language_name} to {target_language_name}.

Rules:
- Return raw JSON only.
- Do not use markdown.
- Do not explain.
- Preserve proper nouns only when they are brand names.
- Translate generic menu section words naturally.
- Do not copy the original label unless source and target languages are the same.
"""

    user_prompt = json.dumps(
        {
            "source_language": source_lang,
            "target_language": target_lang,
            "labels": labels,
            "output_schema": {
                "translations": {
                    "ORIGINAL_LABEL": "TRANSLATED_LABEL"
                }
            },
        },
        ensure_ascii=False,
    )

    payload = _build_payload(system_prompt, user_prompt, max_tokens=1500)
    data = _post_openrouter(payload, timeout=60)

    content = data["choices"][0]["message"].get("content")
    parsed = _extract_json_from_text(content)

    translations = parsed.get("translations", parsed)

    if isinstance(translations, dict):
        return translations

    if isinstance(translations, list):
        normalized = {}
        for entry in translations:
            if not isinstance(entry, dict):
                continue

            source = (
                entry.get("original_label")
                or entry.get("original")
                or entry.get("source")
                or entry.get("label")
            )
            translated = (
                entry.get("translated_label")
                or entry.get("translated")
                or entry.get("translation")
                or entry.get("target")
            )

            if not source and len(entry) == 1:
                source, translated = next(iter(entry.items()))

            if source and translated:
                normalized[str(source)] = translated

        return normalized

    return {}




def get_noise_keywords():
    from app.core.database import SessionLocal
    from app.core.models import NoiseKeyword

    db = SessionLocal()
    try:
        keywords = db.query(NoiseKeyword.keyword).all()
        return [k[0] for k in keywords]
    except Exception as e:
        print(f"Error loading noise keywords from DB: {e}")
        return []
    finally:
        db.close()


def get_section_info(text: str, target_lang: str = "zh"):
    if not text:
        return None

    from app.core.database import SessionLocal
    from app.core.models import MenuCategory

    target_lang = normalize_lang(target_lang)
    key = text.upper().strip()
    key_no_space = key.replace(" ", "")

    db = SessionLocal()
    try:
        category = db.query(MenuCategory).filter(
            (MenuCategory.normalized_key == key.lower()) |
            (MenuCategory.normalized_key == key_no_space.lower()) |
            (MenuCategory.original_label.ilike(text.strip()))
        ).filter(
            MenuCategory.target_language == target_lang
        ).first()

        if not category:
            return None

        return {
            "category": category.normalized_key,
            "translated": category.translated_label or text.title()
        }
    except Exception as e:
        print(f"Error querying MenuCategory in get_section_info: {e}")
        return None
    finally:
        db.close()

def get_target_language_name(target_lang: str) -> str:
    return get_language_name(target_lang)

def get_source_language_name(source_lang: str) -> str:
    return get_language_name(source_lang)

def _extract_json_from_text(content: str) -> dict:
    if not content:
        raise ValueError("OpenRouter returned empty content")
    content = content.strip()

    # 去 markdown
    content = re.sub(r"^```json", "", content)
    content = re.sub(r"^```", "", content)
    content = re.sub(r"```$", "", content)
    content = content.strip()

    # 提取最外层 JSON
    start = content.find("{")
    end = content.rfind("}")

    if start == -1 or end == -1:
        raise ValueError(f"No JSON object found:\n{content}")

    content = content[start:end + 1]

    # 去掉非法控制字符
    content = re.sub(r"[\x00-\x1F]+", " ", content)

    # 修复 trailing commas
    content = re.sub(r",\s*}", "}", content)
    content = re.sub(r",\s*]", "]", content)

    try:
        return json.loads(content)

    except Exception as e:
        print("\n========= BAD JSON =========")
        print(content)
        print("============================\n")

        raise ValueError(
            f"Invalid JSON after cleanup: {str(e)}"
        )


def normalize_vision_json(parsed, target_lang: str, source_lang: str) -> dict:
    if isinstance(parsed, list):
        parsed = {"ocr_lines": parsed}

    if not isinstance(parsed, dict):
        raise ValueError("Vision JSON must be an object or array")

    lines = parsed.get("layout_lines") or []
    ocr_lines = parsed.get("ocr_lines") or parsed.get("lines") or []

    if not isinstance(lines, list):
        lines = []
    if ocr_lines and not isinstance(ocr_lines, list):
        ocr_lines = [ocr_lines]

    if not lines and ocr_lines:
        for index, line in enumerate(ocr_lines[:120]):
            if isinstance(line, dict):
                text = (
                    line.get("text")
                    or line.get("line")
                    or line.get("content")
                    or ""
                )
                role = line.get("line_role") or line.get("role") or ""
            else:
                text = str(line or "")
                role = ""

            text = re.sub(r"\s+", " ", str(text)).strip()
            if not text:
                continue

            lines.append({
                "text": text[:220],
                "line_role": role or "ocr_line",
                "price_text": None,
                "description_text": "",
                "x_order": 0,
                "y_order": index,
            })

    parsed["source_language"] = parsed.get("source_language") or source_lang
    parsed["target_language"] = parsed.get("target_language") or target_lang
    parsed["restaurant_type"] = parsed.get("restaurant_type") or ""
    parsed["business_name"] = parsed.get("business_name")
    parsed["currency"] = parsed.get("currency")
    parsed["menu_pricing"] = parsed.get("menu_pricing") or []
    parsed["layout_lines"] = lines[:120]

    return parsed


def repair_vision_json_content(
    raw_content: str,
    error: Exception,
    target_lang: str,
    source_lang: str,
) -> dict:
    repair_prompt = f"""
Repair this malformed menu OCR JSON into valid compact JSON.

Rules:
- Return only valid raw JSON. No markdown. No explanation.
- Preserve only complete readable menu lines from the input.
- Drop any incomplete trailing object/string.
- Prefer this schema:
{{
  "source_language": "{source_lang}",
  "target_language": "{target_lang}",
  "restaurant_type": "",
  "business_name": null,
  "currency": null,
  "ocr_lines": ["SECTION", "DISH NAME | DESCRIPTION | $12.00"]
}}
- ocr_lines must be an array of strings, not objects.
- Keep at most 120 lines.
- Keep each line under 220 characters.

Parser error:
{str(error)[:500]}

Malformed content:
{raw_content[:12000]}
"""

    payload = {
        "model": OPENROUTER_LAYOUT_MODEL,
        "messages": [
            {
                "role": "user",
                "content": repair_prompt,
            }
        ],
        "temperature": 0,
        "max_tokens": min(OPENROUTER_VISION_MAX_TOKENS, 1800),
        "reasoning": {"enabled": False},
    }

    data = _post_openrouter(payload, timeout=90)
    content = data["choices"][0]["message"].get("content")
    if not content:
        raise ValueError("Vision JSON repair returned empty content")

    return normalize_vision_json(
        extract_json_from_llm(content),
        target_lang=target_lang,
        source_lang=source_lang,
    )


def _is_transient_openrouter_error(data: dict, status_code: int) -> bool:
    if status_code in {408, 409, 425, 429, 500, 502, 503, 504}:
        return True

    error = data.get("error") if isinstance(data, dict) else None
    if isinstance(error, dict):
        return error.get("code") in {408, 409, 425, 429, 500, 502, 503, 504}

    return False


def _post_openrouter(payload: dict, timeout: int = 120) -> dict:
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:8000",
        "X-Title": "Menu Translator App",
    }

    last_error = None

    for attempt in range(OPENROUTER_MAX_RETRIES):
        response = requests.post(
            OPENROUTER_URL,
            headers=headers,
            json=payload,
            timeout=timeout,
        )

        try:
            data = response.json()
        except Exception:
            last_error = RuntimeError(
                f"OpenRouter returned non-JSON response "
                f"{response.status_code}: {response.text}"
            )
            if response.status_code >= 500 and attempt < OPENROUTER_MAX_RETRIES - 1:
                time.sleep(1.5 * (attempt + 1))
                continue
            raise last_error

        if response.status_code != 200:
            last_error = RuntimeError(f"OpenRouter error {response.status_code}: {data}")
            if _is_transient_openrouter_error(data, response.status_code) and attempt < OPENROUTER_MAX_RETRIES - 1:
                time.sleep(1.5 * (attempt + 1))
                continue
            raise last_error

        if "choices" not in data:
            last_error = RuntimeError(f"OpenRouter response missing choices: {data}")
            if _is_transient_openrouter_error(data, response.status_code) and attempt < OPENROUTER_MAX_RETRIES - 1:
                time.sleep(1.5 * (attempt + 1))
                continue
            raise last_error

        return data

    raise last_error or RuntimeError("OpenRouter request failed")


def _build_payload(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 6000,
    model: str | None = None,
) -> dict:
    selected_model = model or OPENROUTER_MODEL
    payload = {
        "model": selected_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.1,
        "max_tokens": max_tokens,
    }

    if selected_model and ":free" not in selected_model:
        payload["response_format"] = {"type": "json_object"}

    return payload


def _compact_ocr_blocks(ocr_blocks: list) -> list:
    compacted = []
    for block in ocr_blocks:
        text = (block.get("text") or "").strip()
        if not text:
            continue

        def rounded(key: str):
            value = block.get(key)
            return round(value) if isinstance(value, (int, float)) else value

        compacted.append(
            {
                "text": text,
                "page": block.get("page", block.get("page_num", 1)),
                "x": rounded("center_x"),
                "y": rounded("center_y"),
                "x0": rounded("x_min"),
                "y0": rounded("y_min"),
                "x1": rounded("x_max"),
                "y1": rounded("y_max"),
            }
        )

    return compacted


def post_process_restore_prefixes(result: dict, ocr_blocks: list) -> dict:
    """
    Post-process the layout parser result to restore number/code prefixes
    to original_name and translated_name if they were stripped.
    """
    menu_items = result.get("menu_items", [])
    if not menu_items:
        return result

    def clean_text_for_matching(text: str) -> str:
        text = text.lower()
        # Keep Chinese characters and alphanumeric characters
        text = re.sub(r'[^\w\u4e00-\u9fff]', '', text)
        return text

    # Map cleaned OCR lines to their raw line text
    ocr_lines_cleaned = []
    for block in ocr_blocks:
        block_text = block.get("text", "")
        # Split by | to look at segments
        segments = [s.strip() for s in block_text.split('|')]
        ocr_lines_cleaned.append({
            "raw": block_text,
            "segments_cleaned": [clean_text_for_matching(s) for s in segments if s.strip()]
        })

    # Prefix regex matches: A01, A-01, 10, 10a, A11S, etc. at the start of a string
    prefix_pattern = re.compile(r'^([A-Za-z]{1,3}-?\d{1,3}[A-Za-z]?|\d{1,3}[A-Za-z]?)[\s.-]+')

    for item in menu_items:
        orig = item.get("original_name", "")
        trans = item.get("translated_name", "")
        
        # If the item already starts with a prefix, skip
        if prefix_pattern.match(orig) or prefix_pattern.match(trans):
            continue
            
        orig_cleaned = clean_text_for_matching(orig)
        trans_cleaned = clean_text_for_matching(trans)
        
        if not orig_cleaned:
            continue
            
        # Try to find the matching OCR block
        matched_prefix = None
        for ocr in ocr_lines_cleaned:
            first_segment_raw = ocr["raw"].split('|')[0].strip()
            m = prefix_pattern.match(first_segment_raw)
            if not m:
                continue
                
            prefix = m.group(1)
            # The rest of the first segment after prefix
            rest_raw = first_segment_raw[m.end():].strip()
            rest_cleaned = clean_text_for_matching(rest_raw)
            
            # Match check: exact, starts/ends, or general containment
            is_match = False
            if rest_cleaned == orig_cleaned or rest_cleaned == trans_cleaned:
                is_match = True
            elif orig_cleaned and trans_cleaned and (orig_cleaned in rest_cleaned) and (trans_cleaned in rest_cleaned):
                if rest_cleaned.startswith(orig_cleaned) or rest_cleaned.endswith(trans_cleaned):
                    is_match = True
            elif len(orig_cleaned) >= 2 and rest_cleaned.startswith(orig_cleaned):
                is_match = True
                
            if is_match:
                matched_prefix = prefix
                # Keep dot if it was present
                full_match_str = m.group(0)
                if '.' in full_match_str:
                    matched_prefix = prefix + "."
                break
                
        if matched_prefix:
            if orig:
                item["original_name"] = f"{matched_prefix} {orig}"
            if trans:
                item["translated_name"] = f"{matched_prefix} {trans}"

    return result


def flatten_nested_menu_json(nested_result: dict) -> dict:
    """
    Convert a nested layout parser result (grouped by section)
    to the flat result format expected by the app.
    """
    flat_result = {
        "source_language": nested_result.get("source_language"),
        "target_language": nested_result.get("target_language"),
        "restaurant_type": nested_result.get("restaurant_type") or "",
        "business_name": nested_result.get("business_name"),
        "currency": nested_result.get("currency"),
        "business_description": nested_result.get("business_description") or {},
        "menu_items": [],
        "menu_pricing": nested_result.get("menu_pricing") or []
    }
    
    dish_counter = 1
    for section in nested_result.get("sections", []):
        sec_orig = (section.get("section_heading_original") or "").strip()
        sec_trans = (section.get("section_heading_translated") or "").strip()
        
        # category key is a normalized snake_case of sec_orig
        category_key = re.sub(r'[^a-z0-9]+', '_', sec_orig.lower()).strip('_')
        if not category_key:
            category_key = "other"
            
        for item in section.get("items", []):
            flat_item = {
                "id": f"dish_{dish_counter:03d}",
                "original_name": item.get("original_name") or "",
                "translated_name": item.get("translated_name") or "",
                "price": item.get("price"),
                "category": category_key,
                "section_heading_original": sec_orig,
                "section_heading_translated": sec_trans,
                "description": item.get("description") or "",
                "ingredients": item.get("ingredients") or [],
                "allergens": item.get("allergens") or [],
                "spicy_level": item.get("spicy_level") or 0,
                "image_prompt": item.get("image_prompt") or "",
                "confidence": item.get("confidence") or 0.9
            }
            flat_result["menu_items"].append(flat_item)
            dish_counter += 1
            
    return flat_result


def _call_openrouter_for_menu_layout_fast(
    ocr_blocks: list,
    target_lang: str,
    source_lang: str,
    model: str | None = None,
) -> dict:
    target_lang = normalize_lang(target_lang, "zh")
    source_lang = normalize_lang(source_lang, "en")
    target_language_name = get_language_name(target_lang)
    source_language_name = get_language_name(source_lang)
    selected_model = model or OPENROUTER_LAYOUT_MODEL

    system_prompt = """
You are a fast, accurate restaurant menu OCR parser.
Return exactly one valid JSON object and no markdown.
"""

    user_prompt = f"""
Task: reconstruct a restaurant menu from OCR blocks and translate user-facing fields.
Source language: {source_lang} ({source_language_name})
Target language: {target_lang} ({target_language_name})

OCR blocks:
{json.dumps(_compact_ocr_blocks(ocr_blocks), ensure_ascii=False)}

Rules:
- Use coordinates to preserve columns, visual groups, section headings, and item order.
- Process the entire OCR list. Do not stop after the first section or truncate the output. You must return ALL visible items.
- Merge split headings before assigning dishes, e.g. "STARTERS +" + "SNACKS" => "STARTERS + SNACKS".
- Assign dishes to the closest heading above them in the same column/group/box.
- Do not infer categories from food type when a visible heading exists.
- Never output a section heading as a menu item unless the menu sells that heading as a set.
- If a dish name is prefixed by a number or code (e.g., "A1.", "05.", "B12"), you MUST preserve this exact number/code prefix in both original_name and translated_name. Do not strip or omit the prefix.
- Bilingual Menu Optimization: If the OCR text for a dish already contains both the source language (e.g. Chinese) and target language (e.g. English) texts (for example, "A1. 回锅肉 Twice-cooked pork" or "A1. 回锅肉 | Twice-cooked pork"), you MUST extract the printed target translation directly from the menu and use it for translated_name (e.g., "A1. Twice-cooked pork") and description (if present) instead of doing AI translation. original_name must be set to the printed original language name (e.g., "A1. 回锅肉").
- For one dish with several size prices, return one item with a combined price string such as "12in: 13 / 14in: 14 / 16in: 16".
- If an OCR block uses " | " separators, treat the first segment as original_name, middle segments as description, and price-like segments as price. Do not include prices in original_name or translated_name. CRITICAL: If a single line contains multiple separate dish names separated by prices (e.g., "素炒河粉 | 10元/份 | 酸辣土豆丝盖饭 | 12元/份"), do NOT treat the second dish name as a description of the first! Instead, split it into two separate menu items (e.g., item 1: "素炒河粉" with price 10元, item 2: "酸辣土豆丝盖饭" with price 12元). Only treat the middle segment as a description if it is clearly explanatory text.
- Extract real menu items only. Exclude restaurant name, hours, address, phone, social media, notes, taxes, and decorative text.
- original_name stays exactly in source language.
- translated_name, description, ingredients, allergens, and section_heading_translated must be in {target_language_name}.
- For target_lang "zh" or "zh-Hant", every translated_name and description must contain Chinese characters.
- For target_lang "zh-Hant", use Traditional Chinese characters for all user-facing text.
- For target_lang "zh", use Simplified Chinese characters for all user-facing text.
- For target_lang "zh" or "zh-Hant", translate English ingredient lists instead of copying them into description, ingredients, or allergens.
- If the menu gives no description, keep the description empty "" or extremely short (under 10 words).
- Keep ingredients and allergens as empty lists [] unless they are explicitly printed on the menu.
- Keep description concise and customer-friendly. Use null for missing prices. Do not invent prices.
- Preserve visible price currency symbols and numeric amounts. Translate language-specific price units into {target_language_name}; for example, target English should use "￥10/serving" instead of "￥10/份". Do not convert currencies.
- Identify the currency symbol or code used on the menu (e.g., '$', '￥', '¥', '元', '€', '£', etc.) based on pricing signs. Put it in currency. Otherwise, set it to null.
- Keep image_prompt extremely short (under 4 words, in English).
- cuisine must be the dish/restaurant cuisine in English Title Case, such as Mexican, Italian, Chinese, Japanese, Korean, Thai, Indian, Vietnamese, American, or Other.
- Use menu-wide evidence for cuisine. For example, fajita, quesadilla, nachos, taco, tostada, burrito, carnitas, carne asada, sopapilla, guacamole, pico de gallo, and jalapeno are Mexican.

JSON schema:
{{
  "source_language": "{source_lang}",
  "target_language": "{target_lang}",
  "restaurant_type": "",
  "business_name": null,
  "currency": null,
  "business_description": {{
    "opening_hours": "",
    "address": "",
    "phone": "",
    "website": "",
    "social_media": [],
    "notes": [],
    "description": ""
  }},
  "sections": [
    {{
      "section_heading_original": "SECTION HEADING IN SOURCE",
      "section_heading_translated": "SECTION HEADING IN TARGET",
      "items": [
        {{
          "original_name": "",
          "translated_name": "",
          "price": null,
          "description": ""
        }}
      ]
    }}
  ]
}}
"""

    payload = _build_payload(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        max_tokens=OPENROUTER_LAYOUT_MAX_TOKENS,
        model=selected_model,
    )

    data = _post_openrouter(payload, timeout=OPENROUTER_LAYOUT_TIMEOUT)
    content = data["choices"][0]["message"]["content"]
    result = _extract_json_from_text(content)

    # Flatten nested JSON if grouped by sections
    if "menu_items" not in result and "sections" in result:
        result = flatten_nested_menu_json(result)

    # Populate default values for compacted fields
    for item in result.get("menu_items", []):
        if "description" not in item:
            item["description"] = ""
        if "ingredients" not in item:
            item["ingredients"] = []
        if "allergens" not in item:
            item["allergens"] = []
        if "spicy_level" not in item:
            item["spicy_level"] = 0
        if "image_prompt" not in item:
            item["image_prompt"] = ""
        if "confidence" not in item:
            item["confidence"] = 0.9

    result = post_process_restore_prefixes(result, ocr_blocks)
    result["analysis_model"] = selected_model
    result["analysis_prompt"] = "fast"
    return result


def call_openrouter_for_menu_layout(
    ocr_blocks: list,
    target_lang: str = "zh",
    source_lang: str = "en",
    model: str | None = None,
) -> dict:
    if USE_FAST_MENU_PROMPT:
        return _call_openrouter_for_menu_layout_fast(
            ocr_blocks=ocr_blocks,
            target_lang=target_lang,
            source_lang=source_lang,
            model=model,
        )

    target_lang = normalize_lang(target_lang, "zh")
    source_lang = normalize_lang(source_lang, "en")
    target_language_name = get_language_name(target_lang)
    source_language_name = get_language_name(source_lang)

    system_prompt = """
You are a professional restaurant menu parser, food translator, and menu layout reconstruction expert.

You will receive OCR blocks with text and bounding box coordinates.
If OCR blocks contain multiple pages, reconstruct the menu across pages.
Use page number only for ordering. Do not treat page number as a menu category.

Your job:
1. Reconstruct the menu's visual layout using coordinates.
2. Identify columns, visual groups, bordered areas, and section headings.
3. Assign each dish to the correct section heading based on visual position.
4. Extract real menu items only.
5. Translate dish names, descriptions, ingredients, and allergens into the requested target language.

Critical layout rules:
- Use x/y coordinates to reconstruct menu layout.
- Items below a section heading and in the same visual column belong to that section.
- Items inside the same visual box or bordered area belong to the nearest heading inside that box.
- Do not merge left-column and right-column sections.
- If a section heading is split into adjacent OCR blocks or lines, merge the fragments before assigning dishes.
- For example, "STARTERS +" followed by "SNACKS" is one heading: "STARTERS + SNACKS".
- A heading fragment ending with "+", "&", "AND", "/", or "-" usually belongs with the nearest heading fragment beside or below it.
- If OCR reading order mixes columns, ignore OCR order and use coordinates.
- Do not classify only by dish type.
- Use actual menu section headings whenever possible.
- Preserve the visual order of dishes.
- If one dish row has multiple size or option price columns, keep it as one menu item.
- For multiple price columns, combine them into one price string, for example "12in: 13 / 14in: 14 / 16in: 16".
- If an OCR block uses " | " separators, treat the first segment as original_name, middle segments as description, and price-like segments as price. Do not include prices in original_name or translated_name. CRITICAL: If a single line contains multiple separate dish names separated by prices (e.g., "素炒河粉 | 10元/份 | 酸辣土豆丝盖饭 | 12元/份"), do NOT treat the second dish name as a description of the first! Instead, split it into two separate menu items (e.g., item 1: "素炒河粉" with price 10元, item 2: "酸辣土豆丝盖饭" with price 12元). Only treat the middle segment as a description if it is clearly explanatory text.
- Do not duplicate the same dish once per size column unless the menu explicitly lists them as separate dishes.
- Do not stop early. Extract the whole menu, including drinks, cafe, tea, pastry, dessert, cheese, and side sections.
- Return raw JSON only.
- Do not use markdown.
"""

    user_prompt = f"""
Target language code: {target_lang}
Target language name: {target_language_name}

OCR blocks with coordinates:
{json.dumps(_compact_ocr_blocks(ocr_blocks), ensure_ascii=False)}

Reconstruct the menu layout first, then extract menu items.

Source language code: {source_lang}
Source language name: {source_language_name}

Rules:
- If source_lang is not "auto", treat the menu source language as {source_language_name}.
- If OCR contains mixed languages, preserve original_name exactly as printed.
- source_language in output must use the detected or requested language code.
- If a dish name is prefixed by a number or code (e.g., "A1.", "05.", "B12"), you MUST preserve this exact number/code prefix in both original_name and translated_name. Do not strip or omit the prefix.
- Bilingual Menu Optimization: If the OCR text for a dish already contains both the source language (e.g. Chinese) and target language (e.g. English) texts (for example, "A1. 回锅肉 Twice-cooked pork" or "A1. 回锅肉 | Twice-cooked pork"), you MUST extract the printed target translation directly from the menu and use it for translated_name (e.g., "A1. Twice-cooked pork") and description (if present) instead of doing AI translation. original_name must be set to the printed original language name (e.g., "A1. 回锅肉").
- Process all items in the OCR blocks, ensuring the full menu is returned. Do not skip, group, or truncate items.

Translation rules:
- original_name must stay in the original menu language.
- translated_name must be translated into {target_language_name} (if bilingual menu optimization is not triggered).
- description must be translated into {target_language_name}.
- ingredients must be translated into {target_language_name}.
- allergens must be translated into {target_language_name}.
- category must stay as a standardized English key from the allowed list.
- If target_lang is "zh" or "zh-Hant", translated_name, description, ingredients, and allergens must use Chinese.
- For target_lang "zh-Hant", use Traditional Chinese characters for all user-facing text.
- For target_lang "zh", use Simplified Chinese characters for all user-facing text.
- For target_lang "zh" or "zh-Hant", do not copy English ingredient phrases into description or ingredients.
- If the menu gives no description, keep the description empty "" or extremely short (under 10 words).
- Keep ingredients and allergens as empty lists [] unless they are explicitly printed on the menu.
- Keep image_prompt extremely short (under 4 words, in English).
- cuisine must be the dish/restaurant cuisine in English Title Case, such as Mexican, Italian, Chinese, Japanese, Korean, Thai, Indian, Vietnamese, American, or Other.
- Use menu-wide evidence for cuisine. For example, fajita, quesadilla, nachos, taco, tostada, burrito, carnitas, carne asada, sopapilla, guacamole, pico de gallo, and jalapeno are Mexican.

Category rules:
- Do not force categories into a predefined food taxonomy.
- Use the actual visual section heading from the menu as the category.
- A dish belongs to the closest section heading above it in the same visual column, same visual group, or same bordered area.
- If the heading says "STARTERS + SNACKS", category must be "starters_snacks".
- If the heading says "SALAD + SOUP", category must be "salad_soup".
- If the heading says "CAFE ET THE", category must be "cafe_tea".
- For unseen section headings, create a normalized snake_case category from the original heading.
- Examples:
  - "STARTERS + SNACKS" => "starters_snacks"
  - "SALAD + SOUP" => "salad_soup"
  - "RAW BAR" => "raw_bar"
  - "HOUSE SPECIALS" => "house_specials"
  - "NOODLES & RICE" => "noodles_rice"
- section_heading_original must contain the exact original section heading text from the menu.
- section_heading_translated must contain the section heading translated into target language.
- Do not infer category from dish type if visual heading is available.
- translated_name, description, ingredients, allergens, spicy_level, image_prompt, and confidence are required for every item.

Important:
- Do not put breakfast items into additions unless the visible heading is actually ADDITIONS.
- Do not put pastries into other. Use "pastries".
- Do not ignore "FROMAGE" or "TODAY'S SELECTION".
- Do not ignore "CAFÉ ET THÉ", coffee, tea, latte, espresso, cappuccino, matcha, chai, hot chocolate, iced tea, or cold brew.
- If a section has no individual dishes but is sold as a set, include it as one menu item.

Business information extraction:
- Extract restaurant/business name if visible. Put it in business_name.
- Identify the currency symbol or code used on the menu (e.g., '$', '￥', '¥', '元', '€', '£', etc.) based on pricing signs. Put it in currency. Otherwise, set it to null.
- Extract non-menu business information into business_description.
- business_description should include visible opening hours, address, phone number, website, social media, service notes, allergy notices, footer notes, restaurant introduction, and other non-menu information.
- Do not create menu_items from business information.
- If business name is not visible, use null.
- If no business description is visible, use {{}}.

Do not treat these as menu items:
- Restaurant name or logo text.
- Opening hours.
- Footer notes.
- Allergy notices.
- Social media.
- Tax or service charge notes.
- Credit card notes.
- Decorative text.

Return valid JSON only.
The first character must be {{ and the last character must be }}.

JSON schema:
{{
  "source_language": "{source_lang}",
  "target_language": "{target_lang}",
  "restaurant_type": "",
  "business_name": null,
  "currency": null,
  "business_description": {{
    "opening_hours": "",
    "address": "",
    "phone": "",
    "website": "",
    "social_media": [],
    "notes": [],
    "description": ""
  }},
  "sections": [
    {{
      "section_heading_original": "SECTION HEADING IN SOURCE",
      "section_heading_translated": "SECTION HEADING IN TARGET",
      "items": [
        {{
          "original_name": "",
          "translated_name": "",
          "price": "",
          "description": ""
        }}
      ]
    }}
  ]
}}

Output requirements:
- Extract all real menu items.
- Preserve original dish names as accurately as possible.
- Preserve visible price currency symbols and numeric amounts. Translate language-specific price units into the target language; for example, target English should use "￥10/serving" instead of "￥10/份".
- Do not convert RMB prices to USD or prefix Chinese menu prices with "$".
- Do not invent missing prices. Use null if missing.
- Keep descriptions short and customer-friendly.
- spicy_level must be 0 to 5.
- confidence must be 0.0 to 1.0.
"""

    payload = _build_payload(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        max_tokens=6000,
        model=model or OPENROUTER_LAYOUT_MODEL,
    )

    data = _post_openrouter(payload, timeout=OPENROUTER_LAYOUT_TIMEOUT)
    content = data["choices"][0]["message"]["content"]

    result = _extract_json_from_text(content)

    # Flatten nested JSON if grouped by sections
    if "menu_items" not in result and "sections" in result:
        result = flatten_nested_menu_json(result)

    # Populate default values for compacted fields
    for item in result.get("menu_items", []):
        if "description" not in item:
            item["description"] = ""
        if "ingredients" not in item:
            item["ingredients"] = []
        if "allergens" not in item:
            item["allergens"] = []
        if "spicy_level" not in item:
            item["spicy_level"] = 0
        if "image_prompt" not in item:
            item["image_prompt"] = ""
        if "confidence" not in item:
            item["confidence"] = 0.9

    result = post_process_restore_prefixes(result, ocr_blocks)
    result["analysis_model"] = model or OPENROUTER_LAYOUT_MODEL
    result["analysis_prompt"] = "full"
    return result


def call_openrouter_for_menu(ocr_text: str, target_lang: str = "zh", source_lang: str = "en") -> dict:
    target_lang = normalize_lang(target_lang, "zh")
    source_lang = normalize_lang(source_lang, "en")
    target_language_name = get_language_name(target_lang)
    source_language_name = get_language_name(source_lang)

    system_prompt = """
You are a professional restaurant menu parser and food translator.

Return raw JSON only.
Do not use markdown.
Do not invent prices.
Extract real menu items only.
Translate content into the requested target language.
The input may be OCR text, Markdown converted from a document, Markdown converted from HTML, or ordered OCR lines converted into Markdown.
"""

    user_prompt = f"""
Target language code: {target_lang}
Target language name: {target_language_name}

Extracted menu content:
{ocr_text}

Source language code: {source_lang}
Source language name: {source_language_name}


Dish name extraction rules:
- original_name must contain only the bold/menu item name, not ingredients or modifiers after commas.
- Text after the first comma is usually description_original or ingredients, not part of original_name.
- For example:
  "ZED’S STRAIGHT UP, L, T, O, P, M" =>
  original_name: "ZED’S STRAIGHT UP"
  description_original: "L, T, O, P, M"
- section_heading_translated must be translated into target_language.
- category_display_name must equal section_heading_translated.

Rules:
- If source_lang is not "auto", treat the menu source language as {source_language_name}.
- If OCR contains mixed languages, preserve original_name exactly as printed.
- source_language in output must use the detected or requested language code.
- original_name must stay in the original menu language.
- translated_name must be translated into {target_language_name}.
- description must be translated into {target_language_name}.
- ingredients must be translated into {target_language_name}.
- allergens must be translated into {target_language_name}.
- category must stay as a standardized English key.

Category rules:
- category must be a stable snake_case key generated from section_heading_original.
- category must be translated into {target_language_name}.
- Do not use a fixed hardcoded category list.
- If section_heading_original is missing, create a general snake_case category based on the item group.

Business information extraction:
- Extract restaurant/business name if visible. Put it in business_name.
- Extract non-menu business information into business_description.
- business_description should include opening hours, address, phone number, website, social media, service notes, allergy notices, footer notes, restaurant introduction, and other non-menu text.
- Do not create menu_items from business information.
- If business name is not visible, use null.
- If no business description is visible, use {{}}.


Return valid JSON only:
{{
  "source_language": "",
  "target_language": "{target_lang}",
  "restaurant_type": "",
  "business_name": null,
  "business_description": {{
    "opening_hours": "",
    "address": "",
    "phone": "",
    "website": "",
    "social_media": [],
    "notes": [],
    "description": ""
  }},
  "menu_items": [
    {{
      "id": "dish_001",
      "original_name": "",
      "translated_name": "",
      "price": null,
      "category": "",
      "section_heading_original": "",
      "description": "",
      "ingredients": [],
      "allergens": [],
      "spicy_level": 0,
      "image_prompt": "",
      "confidence": 0.0
    }}
  ]
}}
"""

    payload = _build_payload(system_prompt=system_prompt, user_prompt=user_prompt, max_tokens=5000)

    data = _post_openrouter(payload, timeout=OPENROUTER_LAYOUT_TIMEOUT)
    content = data["choices"][0]["message"]["content"]

    return _extract_json_from_text(content)


def call_openrouter_for_dish_detail(dish_name: str, target_lang: str = "zh", source_lang: str = "en") -> dict:
    target_lang = normalize_lang(target_lang, "zh")
    source_lang = normalize_lang(source_lang, "en")
    target_language_name = get_language_name(target_lang)
    source_language_name = get_language_name(source_lang)

    system_prompt = """
You are a food expert.
Return raw JSON only.
Do not use markdown.
"""

    user_prompt = f"""
Explain this restaurant dish for a customer.

Dish name: {dish_name}
Source language code: {source_lang}
Source language name: {source_language_name}
Target language code: {target_lang}
Target language name: {target_language_name}

Return valid JSON only:
{{
  "original_name": "{dish_name}",
  "source_language": "{source_lang}",
  "translated_name": "",
  "description": "",
  "taste_profile": "",
  "ingredients": [],
  "allergens": [],
  "spicy_level": 0,
  "recommended_for": "",
  "cuisine": "",
  "image_prompt": ""
}}

Rules:
- Treat dish_name as written in {source_language_name}; translate it into {target_language_name}.
- Translate all user-facing fields into {target_language_name}.
- image_prompt must be exactly: "{{cuisine}} dish for {dish_name}"
- Do not describe ingredients, plating, background, restaurant, or style in image_prompt.
"""

    payload = _build_payload(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        max_tokens=1800,
    )

    data = _post_openrouter(payload, timeout=90)
    content = data["choices"][0]["message"]["content"]

    return _extract_json_from_text(content)


def call_openrouter_for_menu_structure(ocr_blocks, target_lang="zh"):
    """
    Only reconstruct menu layout and extract lightweight dish structure.
    Do NOT generate dish descriptions, ingredients, allergens, image prompts.
    """

    import json
    import requests
    from app.core.config import OPENROUTER_API_KEY

    prompt = f"""
You are a menu layout reconstruction engine.

Target language: {target_lang}

Task:
Analyze OCR layout blocks and reconstruct the menu structure.

Important:
- Use visual section headings from the menu.
- Do NOT classify by dish type if a visual section heading exists.
- Do NOT force categories into predefined labels.
- Preserve section order based on menu layout.
- Assign each dish to the closest visual section heading.
- Return lightweight JSON only.

For each dish, return only:
- id
- original_name
- price
- category
- section_heading_original
- section_heading_translated

Do NOT return:
- description
- ingredients
- allergens
- spicy_level
- image_prompt

Category rules:
- category should be normalized snake_case from the original section heading.
- Example:
  "STARTERS + SNACKS" -> "starters_snacks"
  "SALAD + SOUP" -> "salad_soup"
  "CAFÉ ET THÉ" -> "cafe_et_the"

Return valid JSON only:
{{
  "source_language": "",
  "restaurant_type": "",
  "menu_items": [
    {{
      "id": "dish_001",
      "original_name": "",
      "price": "",
      "category": "",
      "section_heading_original": "",
      "section_heading_translated": ""
    }}
  ]
}}

OCR layout blocks:
{json.dumps(ocr_blocks, ensure_ascii=False)}

Critical output rule:
Return ONLY raw JSON.
Do not include explanation.
Do not include markdown.
Do not include ```json fences.
The first character must be '{' and the last character must be '}'.
"""

    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:8000",
            "X-Title": "Menu Translator App",
        },
        json={
            "model": OPENROUTER_LAYOUT_MODEL,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.1,
            "max_tokens": 2500,
        },
        timeout=180,
    )

    response.raise_for_status()

    content = response.json()["choices"][0]["message"]["content"]

    if "```json" in content:
        content = content.split("```json")[1].split("```")[0].strip()
    elif "```" in content:
        content = content.split("```")[1].split("```")[0].strip()

    return extract_json_from_llm(content)


def call_openrouter_for_missing_dish_details(dishes, target_lang="zh", source_lang="en"):
    target_lang = normalize_lang(target_lang, "zh")
    source_lang = normalize_lang(source_lang, "en")
    target_language_name = get_language_name(target_lang)
    source_language_name = get_language_name(source_lang)
    """
    Enrich only dishes missing from cache.
    """

    import json
    import requests
    from app.core.config import OPENROUTER_API_KEY, OPENROUTER_MODEL

    if not dishes:
        return []

    prompt = f"""
You are a restaurant dish translator.

Target language: {target_lang}

Only enrich the input dishes.
Use original_name and description_original as evidence.
Do not invent prices or sections.
Return only valid raw JSON array. No markdown. No explanation.

Rules:
- translated_name: translate original_name into target language.
- description: one short customer-friendly sentence.
- If target language is zh or zh-Hant, description must be under 35 Chinese characters.
- If target language is zh-Hant, use Traditional Chinese characters for all user-facing text.
- If target language is zh, use Simplified Chinese characters for all user-facing text.
- ingredients: max 5 items, translated.
- allergens: max 5 common allergens, translated.
- spicy_level: integer 0-5.
- image_prompt must be exactly: "{{cuisine}} dish for {{original_name}}"
- Do not describe ingredients, plating, background, restaurant, or style in image_prompt.
- cuisine: English Title Case only. Use menu-wide context and section names; if the menu is clearly Mexican, use "Mexican" instead of "Other" for dishes from that menu.
- Mexican examples: fajita, quesadilla, nachos, taco, tostada, burrito, carnitas, carne asada, sopapilla, guacamole, pico de gallo, and jalapeno.
- section_heading_translated: translate section_heading_original.

Input dishes:
{json.dumps(dishes, ensure_ascii=False)}

Return schema:
[
  {{
    "id": "",
    "original_name": "",
    "source_language": "",
    "translated_name": "",
    "description": "",
    "ingredients": [],
    "allergens": [],
    "spicy_level": 0,
    "image_prompt": "",
    "cuisine": "",
    "section_heading_translated": ""
  }}
]
"""
    
    payload = {
        "model": OPENROUTER_DETAIL_MODEL,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.2,
        "max_tokens": 2500,
    }

    data = _post_openrouter(payload, timeout=90)
    content = data["choices"][0]["message"].get("content")

    if not content:
        print("EMPTY DETAIL RESPONSE:", data)
        return []

    if "```json" in content:
        content = content.split("```json")[1].split("```")[0].strip()
    elif "```" in content:
        content = content.split("```")[1].split("```")[0].strip()

    return extract_json_from_llm(content)

def extract_json_from_llm(content: str):
    import json
    import re

    if not content:
        raise ValueError("OpenRouter returned empty content")

    text = content.strip()

    text = text.replace("```json", "").replace("```", "").strip()

    # 先尝试直接解析
    try:
        return json.loads(text)
    except Exception:
        pass

    # 去掉模型可能输出的说明文字
    first_obj = text.find("{")
    first_arr = text.find("[")

    starts = [x for x in [first_obj, first_arr] if x != -1]
    if not starts:
        raise ValueError(f"No JSON found. Raw content:\n{text[:2000]}")

    start = min(starts)

    # 根据 JSON 开头找结尾
    if text[start] == "{":
        end = text.rfind("}")
    else:
        end = text.rfind("]")

    if end <= start:
        raise ValueError(f"Incomplete JSON. Raw content:\n{text[:2000]}")

    json_text = text[start:end + 1].strip()

    # 清理尾部逗号
    json_text = re.sub(r",\s*}", "}", json_text)
    json_text = re.sub(r",\s*]", "]", json_text)

    try:
        decoder = json.JSONDecoder()
        parsed, _ = decoder.raw_decode(json_text)
        return parsed
    except Exception as e:
        raise ValueError(
            f"Invalid JSON after cleanup: {e}\n\nExtracted:\n{json_text[-2000:]}\n\nRaw:\n{text[:2000]}"
        )
    

def call_openrouter_vision_for_menu(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
    target_lang: str = "zh",
    source_lang: str = "auto",
) -> dict:
    target_lang = normalize_lang(target_lang, "zh")
    source_lang = normalize_lang(source_lang, "auto")
    target_language_name = get_language_name(target_lang)
    source_language_name = get_language_name(source_lang)

    vision_model = OPENROUTER_VISION_MODEL

    image_base64 = base64.b64encode(image_bytes).decode("utf-8")
    image_data_url = f"data:{mime_type};base64,{image_base64}"

    prompt = f"""
You are a strict restaurant menu OCR reader.

Source language code: {source_lang}
Source language name: {source_language_name}
Target language code: {target_lang}
Target language name: {target_language_name}

Return only valid raw JSON. No markdown. No explanation.
If reaching the limit, stop early and close the JSON correctly.

Task:
Read the visible menu text from the image and return compact OCR-like lines.
Do not build final translated menu_items.

Rules:
- Do not translate in this step.
- Do not infer ingredients, allergens, or cuisine from memory.
- Do not invent dishes or prices.
- Use exact visible section headings and dish names.
- If a dish has a number or code prefix (e.g., "A1.", "05.", "B12"), you MUST preserve it exactly at the start of the line.
- Exclude logos, footers, allergy notes, tax notes, service charges, social media, and decorative text.
- Extract the restaurant or business name if printed clearly at the top or bottom of the menu image. Put it in business_name. Otherwise, set it to null.
- Identify the currency symbol or code used on the menu (e.g., '$', '￥', '¥', '元', '€', '£', etc.) based on pricing signs. Put it in currency. Otherwise, set it to null.
- Each ocr_lines entry must be a plain string.
- For a dish row, combine the dish name, nearby description, and same-row price into one string.
- Use " | " between name, description, and price when helpful.
- Do not output separate price-only or description-only lines.
- Remove decorative dot leaders and OCR noise such as g/m.

Hard limit:
- Return at most 120 ocr_lines (or all visible items, do not omit any section of the menu).
- Keep each line under 220 characters.
- You must read and return the ENTIRE menu. Do not truncate, skip, or omit any section of the menu (like drinks, sides, desserts, etc.).

JSON schema:
{{
  "source_language": "{source_lang}",
  "target_language": "{target_lang}",
  "restaurant_type": "",
  "business_name": null,
  "currency": null,
  "ocr_lines": [
    "SECTION HEADING",
    "DISH NAME | visible description | $12.00"
  ]
}}
"""


    payload = {
        "model": vision_model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": prompt,
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": image_data_url,
                        },
                    },
                ],
            }
        ],
        #"temperature": 0.1,
        "temperature": 0,
        "max_tokens": OPENROUTER_VISION_MAX_TOKENS,
        "reasoning": {"enabled": False},
    }

    last_error = None

    for model_name in VISION_FALLBACK_MODELS:
        try:
            if not model_name:
                continue

            payload["model"] = model_name

            print(f"Trying vision model: {model_name}")

            data = _post_openrouter(payload, timeout=OPENROUTER_VISION_TIMEOUT)
            content = data["choices"][0]["message"].get("content")

            if not content:
                last_error = f"Empty content from {model_name}"
                print(last_error)
                continue

            try:
                parsed = _extract_json_from_text(content)
            except Exception as parse_error:
                print(f"Vision JSON parse failed for {model_name}: {parse_error}")
                # Check if there are other models to try
                is_last_model = (model_name == VISION_FALLBACK_MODELS[-1])
                if not is_last_model:
                    print("Falling back to next model instead of repairing...")
                    last_error = parse_error
                    continue
                else:
                    print("No more fallback models. Attempting repair as last resort...")
                    parsed = repair_vision_json_content(
                        raw_content=content,
                        error=parse_error,
                        target_lang=target_lang,
                        source_lang=source_lang,
                    )

            return normalize_vision_json(
                parsed,
                target_lang=target_lang,
                source_lang=source_lang,
            )

        except Exception as e:
            last_error = e
            print(f"Vision model failed: {model_name} -> {e}")
            continue

    raise RuntimeError(f"All vision models failed: {last_error}")

def extract_dish_candidates_from_ocr_blocks(
    ocr_blocks: list,
    target_lang: str = "zh",
    source_lang: str = "auto",
) -> dict:
    def clean_price(raw):
        if not raw:
            return None

        s = raw.upper()
        s = s.replace("$", "")
        s = s.replace("S", "")
        s = s.replace("I", "1")
        s = s.replace("L", "1")
        s = s.replace("T", "1")
        s = s.replace("O", "0")
        s = re.sub(r"[^0-9.]", "", s)

        if not s:
            return None

        # 防止 S65 被识别成 65，Bread Rolls 实际是 6.5
        if s == "65":
            return "6.5"

        return s

    def is_noise(text):
        upper = text.upper()
        noise_keywords = get_noise_keywords()
        return any(k in upper for k in noise_keywords)

    def looks_like_section(text):
        return get_section_info(text, target_lang) is not None

    def extract_name_price(text):
        original = text.strip()

        # 修复 OCR 常见错误：S10 / Si5 / $i5 / $T8
        fixed = original
        fixed = re.sub(r"\bS(?=\d)", "$", fixed)
        fixed = re.sub(r"\$[iIlL]", "$1", fixed)
        fixed = re.sub(r"\$T", "$1", fixed)

        # 允许无空格价格：GreekSalad $10 / Chef'sSalad$11 / CarbonaraSi7
        patterns = [
            r"^(.+?)\s*\$\s*([0-9]{1,2}(?:\.[0-9]{1,2})?)\b",
            r"^(.+?)\s+S\s*([0-9]{1,2})\b",
            r"^(.+?)S([0-9]{1,2})\b",
            r"^(.+?)Si([0-9]{1,2})\b",
            r"^(.+?)\$i([0-9]{1,2})\b",
        ]

        for p in patterns:
            m = re.search(p, fixed, flags=re.IGNORECASE)
            if m:
                name = m.group(1).strip(" -,:")
                price = clean_price(m.group(2))
                return name, price

        return None, None

    sorted_blocks = sorted(
        ocr_blocks,
        key=lambda b: (float(b.get("center_y", 0)), float(b.get("center_x", 0)))
    )

    items = []
    current_section = "menu"
    current_section_original = "Menu"
    current_section_translated = "菜单"
    dish_id = 1

    for block in sorted_blocks:
        text = (block.get("text") or "").strip()
        if not text:
            continue

        if looks_like_section(text):
            section_info = get_section_info(
                text,
                target_lang
            )
            current_section_original = text.upper().strip()
            current_section = (
                section_info["category"]
            )
            current_section_translated = (
                section_info["translated"]
            )
            continue

        if is_noise(text):
            continue

        name, price = extract_name_price(text)

        if not name or not price:
            continue

        if len(name) < 3:
            continue

        upper_name = name.upper()

        # 排除尺寸/加料，不要当成菜
        if upper_name in ["LARGE", "SMALL", "CUP", "BOWL"]:
            continue

        if any(k in upper_name for k in ["ADD ", "SUB ", "CHOICE OF"]):
            continue

        item = {
            "id": f"dish_{dish_id:03d}",
            "original_name": name,
            "price": price,
            "category": current_section,
            "section_heading_original": current_section_original,
            "section_heading_translated": current_section_translated,
            "source_language": "en",
            "translated_name": None,
            "description": None,
            "ingredients": [],
            "allergens": [],
            "spicy_level": 0,
            "image_prompt": None,
            "cache_hit": False,
        }

        items.append(item)
        dish_id += 1

    return {
        "source_language": source_lang,
        "target_language": target_lang,
        "restaurant_type": None,
        "menu_items": items,
    }


def call_openrouter_for_recommendation(
    menu_items: list[dict],
    people: int | None = None,
    diets: list[str] | None = None,
    allergies: list[str] | None = None,
    budget: str | None = None,
    taste: str | None = None,
    target_lang: str = "zh"
) -> dict:
    target_lang = normalize_lang(target_lang, "zh")
    target_language_name = get_language_name(target_lang)

    system_prompt = f"""
You are a professional restaurant ordering advisor.
Your job is to analyze the menu items and recommend a selection of dishes for the user based on their preferences (such as number of people, diet constraints, food allergies, budget, taste/lightness preferences).

You must return a raw JSON object matching this schema:
{{
  "recommendation": "Overall ordering advice and portion recommendations in {target_language_name}.",
  "items": [
    {{
      "id": "dish_id_from_menu",
      "reason": "Clear explanation of why this dish fits their preference, in {target_language_name}."
    }}
  ]
}}

Rules:
- Provide the recommendation text and reasons in {target_language_name}.
- Only recommend dish IDs that exist in the menu items list.
- Ensure the selected dishes respect all specified diet constraints (e.g. Vegetarian, Halal, Kosher, Keto, Gluten-Free).
- CRITICAL: DO NOT recommend any dish that contains any of the user's food allergies! Filter them out.
- Make sure the total estimated cost fits the budget if specified.
- Do not use markdown code blocks (e.g. no ```json). Return raw JSON only.
"""

    simplified_items = []
    for item in menu_items:
        simplified_items.append({
            "id": item.get("id"),
            "original_name": item.get("original_name"),
            "translated_name": item.get("translated_name") or item.get("name"),
            "price": item.get("price"),
            "category": item.get("category") or item.get("section_heading_translated"),
            "description": item.get("description"),
            "ingredients": item.get("ingredients") or [],
            "allergens": item.get("allergens") or [],
            "spicy_level": item.get("spicy_level", 0)
        })

    user_prompt = json.dumps(
        {
            "target_language": target_language_name,
            "menu_items": simplified_items,
            "preferences": {
                "people": people,
                "diet_constraints": diets or [],
                "food_allergies": allergies or [],
                "budget": budget,
                "taste_preferences": taste
            }
        },
        ensure_ascii=False
    )

    payload = _build_payload(system_prompt, user_prompt, max_tokens=3000)
    data = _post_openrouter(payload, timeout=90)
    content = data["choices"][0]["message"].get("content")
    
    return _extract_json_from_text(content)

