import json
import re
import requests
import base64
import os
from pathlib import Path
from app.config import OPENROUTER_API_KEY, OPENROUTER_MODEL, OPENROUTER_VISION_MODEL
VISION_FALLBACK_MODELS = [
    OPENROUTER_VISION_MODEL,
    "google/gemini-2.5-flash-lite",
    "baidu/qianfan-ocr-fast:free",
]
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


_RULES_CACHE = None


def load_menu_parser_rules():
    global _RULES_CACHE

    if _RULES_CACHE is not None:
        return _RULES_CACHE

    rules_path = (
        Path(__file__).resolve().parent
        / "menu_parser_rules.json"
    )

    with open(rules_path, "r", encoding="utf-8") as f:
        _RULES_CACHE = json.load(f)

    return _RULES_CACHE


def get_noise_keywords():
    rules = load_menu_parser_rules()
    return rules.get("noise_keywords", [])


def get_section_info(text: str, target_lang: str = "zh"):
    if not text:
        return None

    rules = load_menu_parser_rules()

    section_map = rules.get("section_headings", {})

    key = text.upper().strip()
    key_no_space = key.replace(" ", "")

    info = (
        section_map.get(key)
        or section_map.get(key_no_space)
    )

    if not info:
        return None

    return {
        "category": info.get("category"),
        "translated": (
            info.get("translations", {})
            .get(target_lang)
            or text.title()
        )
    }


def get_target_language_name(target_lang: str) -> str:
    language_map = {
        "zh": "Simplified Chinese",
        "en": "English",
        "ja": "Japanese",
        "ko": "Korean",
        "fr": "French",
        "es": "Spanish",
        "de": "German",
        "it": "Italian",
        "pt": "Portuguese",
    }

    return language_map.get(target_lang, target_lang)


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


def _post_openrouter(payload: dict, timeout: int = 120) -> dict:
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:8000",
        "X-Title": "Menu Translator App",
    }

    response = requests.post(
        OPENROUTER_URL,
        headers=headers,
        json=payload,
        timeout=timeout,
    )

    try:
        data = response.json()
    except Exception:
        raise RuntimeError(
            f"OpenRouter returned non-JSON response "
            f"{response.status_code}: {response.text}"
        )

    if response.status_code != 200:
        raise RuntimeError(f"OpenRouter error {response.status_code}: {data}")

    if "choices" not in data:
        raise RuntimeError(f"OpenRouter response missing choices: {data}")

    return data


def _build_payload(system_prompt: str, user_prompt: str, max_tokens: int = 6000) -> dict:
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.1,
        "max_tokens": max_tokens,
    }

    if OPENROUTER_MODEL and ":free" not in OPENROUTER_MODEL:
        payload["response_format"] = {"type": "json_object"}

    return payload

def call_openrouter_for_menu_layout(
    ocr_blocks: list,
    target_lang: str = "zh"
) -> dict:
    target_language_name = get_target_language_name(target_lang)

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
- If OCR reading order mixes columns, ignore OCR order and use coordinates.
- Do not classify only by dish type.
- Use actual menu section headings whenever possible.
- Preserve the visual order of dishes.
- Do not stop early. Extract the whole menu, including drinks, cafe, tea, pastry, dessert, cheese, and side sections.
- Return raw JSON only.
- Do not use markdown.
"""

    user_prompt = f"""
Target language code: {target_lang}
Target language name: {target_language_name}

OCR blocks with coordinates:
{json.dumps(ocr_blocks, ensure_ascii=False)}

Reconstruct the menu layout first, then extract menu items.

Source language:
- Detect automatically.
- Do not require the user to specify source language.

Translation rules:
- original_name must stay in the original menu language.
- translated_name must be translated into {target_language_name}.
- description must be translated into {target_language_name}.
- ingredients must be translated into {target_language_name}.
- allergens must be translated into {target_language_name}.
- category must stay as a standardized English key from the allowed list.

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

Important:
- Do not put breakfast items into additions unless the visible heading is actually ADDITIONS.
- Do not put pastries into other. Use "pastries".
- Do not ignore "FROMAGE" or "TODAY'S SELECTION".
- Do not ignore "CAFÉ ET THÉ", coffee, tea, latte, espresso, cappuccino, matcha, chai, hot chocolate, iced tea, or cold brew.
- If a section has no individual dishes but is sold as a set, include it as one menu item.

Exclude:
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
  "source_language": "",
  "target_language": "{target_lang}",
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

Output requirements:
- Extract all real menu items.
- Preserve original dish names as accurately as possible.
- Keep price as a string without currency symbol, for example "9.00".
- Do not invent missing prices. Use null if missing.
- Keep descriptions short and customer-friendly.
- spicy_level must be 0 to 5.
- confidence must be 0.0 to 1.0.
"""

    payload = _build_payload(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        max_tokens=6000,
    )

    data = _post_openrouter(payload, timeout=180)
    content = data["choices"][0]["message"]["content"]

    return _extract_json_from_text(content)


def call_openrouter_for_menu(
    ocr_text: str,
    target_lang: str = "zh"
) -> dict:
    target_language_name = get_target_language_name(target_lang)

    system_prompt = """
You are a professional restaurant menu parser and food translator.

Return raw JSON only.
Do not use markdown.
Do not invent prices.
Extract real menu items only.
Translate content into the requested target language.
"""

    user_prompt = f"""
Target language code: {target_lang}
Target language name: {target_language_name}

OCR text:
{ocr_text}

Source language:
- Detect automatically.
- Do not require the user to specify source language.

Rules:
- original_name must stay in the original menu language.
- translated_name must be translated into {target_language_name}.
- description must be translated into {target_language_name}.
- ingredients must be translated into {target_language_name}.
- allergens must be translated into {target_language_name}.
- category must stay as a standardized English key.

Allowed categories:
breakfast, pastries, savory, fromage, cafe, sides, additions, snacks, appetizers, mains, dinner, dessert, drinks, other.

Return valid JSON only:
{{
  "source_language": "",
  "target_language": "{target_lang}",
  "restaurant_type": "",
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

    payload = _build_payload(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        max_tokens=5000,
    )

    data = _post_openrouter(payload, timeout=150)
    content = data["choices"][0]["message"]["content"]

    return _extract_json_from_text(content)


def call_openrouter_for_dish_detail(
    dish_name: str,
    target_lang: str = "zh"
) -> dict:
    target_language_name = get_target_language_name(target_lang)

    system_prompt = """
You are a food expert.
Return raw JSON only.
Do not use markdown.
"""

    user_prompt = f"""
Explain this restaurant dish for a customer.

Dish name: {dish_name}
Target language code: {target_lang}
Target language name: {target_language_name}

Return valid JSON only:
{{
  "dish_name": "{dish_name}",
  "translated_name": "",
  "description": "",
  "taste_profile": "",
  "main_ingredients": [],
  "allergens": [],
  "spicy_level": 0,
  "recommended_for": "",
  "image_prompt": ""
}}

Rules:
- Translate all user-facing fields into {target_language_name}.
- Keep image_prompt in English for image generation.
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
    from app.config import OPENROUTER_API_KEY, OPENROUTER_MODEL

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
            "model": OPENROUTER_MODEL,
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


def call_openrouter_for_missing_dish_details(dishes, target_lang="zh"):
    """
    Enrich only dishes missing from cache.
    """

    import json
    import requests
    from app.config import OPENROUTER_API_KEY, OPENROUTER_MODEL

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
- If target language is zh, description must be under 35 Chinese characters.
- ingredients: max 5 items, translated.
- allergens: max 5 common allergens, translated.
- spicy_level: integer 0-5.
- image_prompt: English only, under 20 words.
- cuisine: English Title Case only. If unsure, use "Other".
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
    
    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": OPENROUTER_MODEL,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2,
            "max_tokens": 1200,
        },
        timeout=180,
    )

    response.raise_for_status()

    data = response.json()
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
) -> dict:
    target_language_name = get_target_language_name(target_lang)

    vision_model = OPENROUTER_VISION_MODEL

    image_base64 = base64.b64encode(image_bytes).decode("utf-8")
    image_data_url = f"data:{mime_type};base64,{image_base64}"

    prompt = f"""
You are a strict restaurant menu OCR and layout parser.

Target language code: {target_lang}
Target language name: {target_language_name}

Return only valid raw JSON. No markdown. No explanation.
If reaching the limit, stop early and close the JSON correctly.

Task:
Extract compact menu layout lines from the image.
Do not build final translated menu_items.
Classify each output line only as:
- section_heading
- dish_name

Rules:
- Do not translate in this step.
- Do not generate ingredients, allergens, cuisine, or final descriptions.
- Do not invent dishes or prices.
- Use exact visible dish names.
- Use section headings only for grouping.
- Never include section headings as dishes.
- Exclude logos, footers, allergy notes, tax notes, service charges, social media, and decorative text.
- For each dish, combine dish name, nearby description, and same-row price into one layout_lines item.
- Put nearby description into description_text.
- Set price_text to the same-row right-aligned price if visible. Otherwise set price_text to null.
- For boxed/list sections like SUSHI, prices may appear far right; match by the same visual row.
- Do not output separate price-only or description-only lines.
- Remove noise such as g/m.

Prix fixe / set menu rules:
- Do not include prix fixe headings as layout_lines.
- Put prix fixe / set menu / combo pricing into menu_pricing.
- Include label, price, unit, description, applies_to, and details.
- details should list visible starter and entrée choices as readable plain text.

Hard limit:
- Return at most 25 layout_lines.
- Include menu_pricing first if visible.
- Never output more than 25 objects inside layout_lines.

JSON schema:
{{
  "source_language": "",
  "target_language": "{target_lang}",
  "restaurant_type": "",
  "menu_pricing": [
    {{
      "label": "",
      "price": "",
      "unit": "",
      "description": "",
      "applies_to": "",
      "details": ""
    }}
  ],
  "layout_lines": [
    {{
      "text": "",
      "line_role": "section_heading",
      "price_text": null,
      "description_text": "",
      "font_size_hint": "medium",
      "x_order": 0,
      "y_order": 0
    }}
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
        "max_tokens": 300,
        "reasoning": {"enabled": False},
    }

    last_error = None

    for model_name in VISION_FALLBACK_MODELS:
        try:
            if not model_name:
                continue

            payload["model"] = model_name

            print(f"Trying vision model: {model_name}")

            data = _post_openrouter(payload, timeout=180)
            content = data["choices"][0]["message"].get("content")

            if not content:
                last_error = f"Empty content from {model_name}"
                print(last_error)
                continue

            return _extract_json_from_text(content)

        except Exception as e:
            last_error = e
            print(f"Vision model failed: {model_name} -> {e}")
            continue

    raise RuntimeError(f"All vision models failed: {last_error}")

def extract_dish_candidates_from_ocr_blocks(
    ocr_blocks: list,
    target_lang: str = "zh"
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
        "source_language": "en",
        "target_language": target_lang,
        "restaurant_type": "italian",
        "menu_items": items,
    }
