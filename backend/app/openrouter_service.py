import json
import re
import requests
import base64
import os
from app.config import OPENROUTER_API_KEY, OPENROUTER_MODEL

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


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
        "reasoning": {
            "enabled": False
        },
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
You are a food translation and dish explanation assistant.

Target language: {target_lang}
Only enrich the dishes provided. 
Return valid JSON array only.
Use description_original as the main evidence. Do not invent details unrelated to the original menu text. 

For each dish, return:
- id
- original_name
- translated_name
- description
- ingredients
- allergens
- spicy_level
- image_prompt
- cuisine
- section_heading_translated

Rules:
- Translate dish name into target language.
- Description must be in target language.
- Ingredients should be translated into target language.
- Allergens should be common allergen names in target language.
- spicy_level is 0-5.
- Do not invent price or section.
- Translate section_heading_original into target language and return section_heading_translated.
- Do not change category.
- Preserve price from input if present.
- cuisine must be a standardized English cuisine label in Title Case. Do not translate cuisine into the target language. If unsure, use "Other".
- Use labels like: American, French, Italian, Chinese, Japanese, Korean, Mexican, Mediterranean, European, Cafe, Seafood, Dessert, Drink, Other.
- section_heading_translated must translate section_heading_original into target language.


Input dishes:
{json.dumps(dishes, ensure_ascii=False)}

Return:
[
  {{
    "id": "dish_001",
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

Critical output rule:
Return ONLY raw JSON array.
Do not include explanation.
Do not include markdown.
Do not include ```json fences.
The first character must be [ and the last character must be ].
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
            "max_tokens": 2500,
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

    vision_model = os.getenv(
        "OPENROUTER_VISION_MODEL",
        "openrouter/free"
    )

    image_base64 = base64.b64encode(image_bytes).decode("utf-8")
    image_data_url = f"data:{mime_type};base64,{image_base64}"

    prompt = f"""
You are a strict restaurant menu OCR and layout parser.

Analyze the menu image directly.

Target language code: {target_lang}
Target language name: {target_language_name}

Return ONLY valid raw JSON.
Do not use markdown.
Do not include explanations.
Return complete valid JSON even if not all items are extracted.
Never include section headings such as APPETIZERS, SUSHI, SOUPS & SALADS, ENTREES, DESSERTS as menu_items. Use them only as section_heading_original.

Your task:
Extract OCR layout lines from the image. Do not build final menu_items.
Classify each output item only as section_heading or dish_name.

Very important rules:
- Do NOT translate dish names in this step.
- Do NOT generate descriptions.
- Do NOT generate ingredients.
- Do NOT infer allergens.
- Do NOT invent dishes.
- Do NOT rewrite or summarize menu text.
- original_name must be the exact dish name from the menu.
- description_original should contain nearby description text only if it is clearly under that dish.
- If a line is only a section heading, do not include it as a menu item.
- If a line is only an instruction such as "Choice of", "Served with", "per person", "Prix Fixe", do not include it as a menu item.
- If a section heading says "LUNCH PRIX FIXE", do not include it in layout_lines. Put it only in menu_pricing.
- Extract price only when it is visually attached to the same dish.
- If price appears as "$26", return "26".
- If price appears as "$36 per person", return "36".
- For boxed/list sections like SUSHI, prices may appear in a right-aligned column. Match each dish to the price on the same visual row, even if the price is far to the right.
- If no price is visually attached to the dish, return null, do not leave price_text null if a number is visible on the same row as the dish.
- Do not merge dish name with description.
- Dish name is usually the bold/title line.
- Description is usually smaller text below the dish name.
- Preserve the visual section grouping.
- If the menu has a prix fixe, set menu, tasting menu, combo, or per-person price, put it in menu_pricing.
- Do not copy set menu prices to every dish unless the price is visually attached to that specific dish.
- For "LUNCH PRIX FIXE $36 per person", return menu_pricing label="LUNCH PRIX FIXE", price="36", unit="per person".

HARD LIMIT:
- Return at most 30 layout_lines total.
- Include menu_pricing first if visible.
- Stop after 30 layout_lines and close the JSON immediately.
- Never output more than 30 objects inside layout_lines.

Important compact output rules:
- Do NOT output separate price-only lines.
- Do NOT output separate description-only lines.
- For each dish, combine dish name, nearby description, and nearby price into ONE layout_lines item.
- layout_lines should contain only:
  1. section_heading lines
  2. dish_name lines
- If text is a description under a dish, put it into description_text of that dish.
- If text is a price near a dish, put it into price_text of that dish.
- Do not output more than 35 layout_lines total.
- Return complete valid JSON. Stop early if needed.



Return JSON schema:
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

Bad examples, do NOT extract as dishes:
- "LUNCH PRIX FIXE"
- "ENTRÉE Choice of:"
- "STARTER Choice of:"
- "Served with Fresh Baked Cookies. $36 per person"
- "g/m"
- footer notes
- allergy notices


If the menu contains prix fixe / set menu / set meal / combo pricing / omakase, return it in menu_pricing.
Example:
LUNCH PRIX FIXE
Served with Fresh Baked Cookies. $36 per person
For prix fixe / set menu, put all visible starter choices and entree choices into menu_pricing.details as readable plain text.

Return:
{{
  "label": "LUNCH PRIX FIXE",
  "price": "36",
  "unit": "per person",
  "description": "Served with Fresh Baked Cookies.",
  "applies_to": "STARTER Choice of, ENTRÉE Choice of"
}}
Do not include LUNCH PRIX FIXE itself as a dish.

Output only JSON.
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
        "temperature": 0.1,
        "max_tokens": 5000,
        "reasoning": {
            "enabled": False
        },
    }

    data = _post_openrouter(payload, timeout=180)
    content = data["choices"][0]["message"].get("content")

    if not content:
        print("EMPTY VISION RESPONSE:", data)
        raise RuntimeError("OpenRouter Vision returned empty content. Please retry or switch model.")

    return _extract_json_from_text(content)