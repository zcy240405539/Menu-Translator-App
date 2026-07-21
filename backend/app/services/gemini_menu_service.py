import json
import os
import time

import requests

from app.core.config import GEMINI_API_KEY, GEMINI_MODEL, LAYOUT_MAX_TOKENS
from app.core.i18n_service import get_language_name, normalize_lang
from app.language_modules import build_language_prompt_context, get_language_profile
from app.services.openrouter_service import (
    _compact_ocr_blocks,
    _extract_json_from_text,
    flatten_nested_menu_json,
    post_process_restore_prefixes,
    sanitize_menu_result_structure,
)


GEMINI_GENERATE_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
GEMINI_MENU_STRUCTURE_MODEL = os.getenv("GEMINI_MENU_STRUCTURE_MODEL", GEMINI_MODEL)
GEMINI_MENU_STRUCTURE_TIMEOUT = int(os.getenv("GEMINI_MENU_STRUCTURE_TIMEOUT", "45"))
GEMINI_MENU_MAX_RETRIES = max(1, int(os.getenv("GEMINI_MENU_MAX_RETRIES", "2")))


def is_gemini_menu_configured() -> bool:
    return bool(GEMINI_API_KEY)


def _post_gemini_generate(
    system_prompt: str,
    user_prompt: str,
    max_output_tokens: int = LAYOUT_MAX_TOKENS,
    timeout: int = GEMINI_MENU_STRUCTURE_TIMEOUT,
    model: str | None = None,
) -> str:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is missing")

    endpoint = GEMINI_GENERATE_URL.format(model=model or GEMINI_MENU_STRUCTURE_MODEL)
    payload = {
        "systemInstruction": {
            "parts": [{"text": system_prompt}],
        },
        "contents": [
            {
                "role": "user",
                "parts": [{"text": user_prompt}],
            }
        ],
        "generationConfig": {
            "temperature": 0,
            "maxOutputTokens": max_output_tokens,
            "responseMimeType": "application/json",
        },
    }

    last_error = None
    for attempt in range(GEMINI_MENU_MAX_RETRIES):
        response = requests.post(
            endpoint,
            params={"key": GEMINI_API_KEY},
            headers={"Content-Type": "application/json"},
            json=payload,
            timeout=timeout,
        )
        if response.status_code in {408, 409, 425, 429, 500, 502, 503, 504} and attempt < GEMINI_MENU_MAX_RETRIES - 1:
            last_error = RuntimeError(f"Gemini transient error {response.status_code}: {response.text[:1000]}")
            time.sleep(1.5 * (attempt + 1))
            continue

        try:
            data = response.json()
        except Exception as exc:
            raise RuntimeError(f"Gemini returned non-JSON response {response.status_code}: {response.text[:1000]}") from exc

        if response.status_code != 200:
            raise RuntimeError(f"Gemini error {response.status_code}: {data}")

        candidates = data.get("candidates") or []
        if not candidates:
            raise RuntimeError(f"Gemini response missing candidates: {data}")

        parts = candidates[0].get("content", {}).get("parts") or []
        text = "".join(str(part.get("text") or "") for part in parts).strip()
        if not text:
            raise RuntimeError(f"Gemini response missing text: {data}")
        return text

    raise last_error or RuntimeError("Gemini request failed")


def _parse_gemini_json(content: str, prompt_name: str) -> dict:
    try:
        return _extract_json_from_text(content)
    except Exception as first_error:
        repair_prompt = f"""
Repair this malformed restaurant menu JSON.

Rules:
- Return exactly one valid JSON object.
- No markdown. No explanation.
- Preserve all complete sections and menu items from the malformed JSON.
- Drop only incomplete trailing objects or fields if necessary.
- Keep the same top-level schema with sections/items.

Parser error:
{str(first_error)[:800]}

Malformed JSON:
{content[:24000]}
"""
        repaired = _post_gemini_generate(
            "You repair malformed JSON and return JSON only.",
            repair_prompt,
            max_output_tokens=min(LAYOUT_MAX_TOKENS, 8000),
            timeout=GEMINI_MENU_STRUCTURE_TIMEOUT,
        )
        try:
            return _extract_json_from_text(repaired)
        except Exception as repair_error:
            raise ValueError(
                f"Gemini {prompt_name} JSON parse failed: {first_error}; repair failed: {repair_error}"
            ) from repair_error


def _finalize_menu_result(
    result: dict,
    ocr_blocks: list | None = None,
    prompt_name: str = "markdown",
    analysis_model: str | None = None,
) -> dict:
    if "menu_items" not in result and "sections" in result:
        result = flatten_nested_menu_json(result)

    for item in result.get("menu_items", []) or []:
        item.setdefault("translated_name", "")
        item.setdefault("section_heading_translated", "")
        item.setdefault("description", "")
        item.setdefault("description_original", item.get("description") or "")
        item.setdefault("ingredients", [])
        item.setdefault("allergens", [])
        item.setdefault("spicy_level", 0)
        item.setdefault("image_prompt", "")
        item.setdefault("confidence", 0.9)

    result = sanitize_menu_result_structure(result)
    if ocr_blocks is not None:
        result = post_process_restore_prefixes(result, ocr_blocks)
    result["analysis_provider"] = "gemini"
    result["analysis_model"] = analysis_model or GEMINI_MENU_STRUCTURE_MODEL
    result["analysis_prompt"] = prompt_name
    return result


def _menu_json_contract(target_lang: str, source_lang: str) -> str:
    return f"""
Return exactly one valid JSON object with this shape:
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
  "menu_items": [
    {{
      "original_name": "",
      "price": null,
      "section_heading_original": "VISIBLE SECTION HEADING",
      "description_original": "",
      "confidence": 0.9
    }}
  ]
}}
"""


def call_gemini_for_menu(
    ocr_text: str,
    target_lang: str = "zh",
    source_lang: str = "en",
) -> dict:
    target_lang = normalize_lang(target_lang, "zh")
    source_lang = normalize_lang(source_lang, "en")
    target_language_name = get_language_name(target_lang)
    source_language_name = get_language_name(source_lang)
    language_profile = get_language_profile(source_lang)
    language_context = build_language_prompt_context(source_lang, target_lang)
    selected_model = language_profile.gemini_structure_model or GEMINI_MENU_STRUCTURE_MODEL

    system_prompt = """
You are a strict restaurant menu structure parser.
Return JSON only. Do not use markdown. Do not translate menu text.
Google Cloud Translation runs after this step.
Extract real menu items only and preserve visible section hierarchy.
"""

    user_prompt = f"""
Target language code: {target_lang}
Target language name: {target_language_name}
Source language code: {source_lang}
Source language name: {source_language_name}

{language_context}

Extracted menu content:
{ocr_text}

Structure rules:
- Return a flat menu_items array. Do not return nested sections.
- Every item must include its visible section in section_heading_original.
- Use actual visible menu section headings as section_heading_original.
- Do not classify by food type if a visible section heading exists.
- Do not use a dish name as its own section unless it is the only item sold as a set under that heading.
- For markdown from HTML, top-level headings (# BREAKFAST, # FOOD, # BRUNCH DRINKS) are usually menu sections.
- For markdown from HTML, subheadings below a menu section (## Egg Sandwich, ## Crab Cakes, ## Bloody Mary) are usually menu items when followed by a price, description, or sibling item headings.
- If a section has item-like subheadings, keep the parent # heading as the section for those items.
- Do not create menu items from navigation, hotel names, footer links, social media, policies, reservations, login, cart, or business boilerplate.
- Never use price-only lines such as "9", "$14", or "13" as section headings or item names.
- If a price appears right after a dish heading, assign it to that dish.
- If a price appears right after a section heading and many following items lack prices, treat it as a section default price.
- If a heading includes a section price, such as "VERDURAS 14", use "VERDURAS" as section heading and "14" as default price.
- Preserve original_name exactly as printed. Do not translate it.
- Preserve printed descriptions in description_original. Do not invent descriptions.
- Use null for missing prices. Do not invent prices.
- Omit translated_name, section_heading_translated, ingredients, allergens, image_prompt, and description unless they are explicitly printed.
- Process the full menu, including drinks, coffee, tea, dessert, brunch, sides, pastries, and happy hour.

Business info:
- Put restaurant intro, hours, address, social links, notes, and footer text in business_description, not menu_items.
- If no business name is visible, use null.

{_menu_json_contract(target_lang, source_lang)}
"""

    content = _post_gemini_generate(system_prompt, user_prompt, model=selected_model)
    return _finalize_menu_result(
        _parse_gemini_json(content, "markdown"),
        prompt_name="markdown",
        analysis_model=selected_model,
    )


def call_gemini_for_menu_layout(
    ocr_blocks: list,
    target_lang: str = "zh",
    source_lang: str = "en",
) -> dict:
    target_lang = normalize_lang(target_lang, "zh")
    source_lang = normalize_lang(source_lang, "en")
    target_language_name = get_language_name(target_lang)
    source_language_name = get_language_name(source_lang)
    language_profile = get_language_profile(source_lang)
    language_context = build_language_prompt_context(source_lang, target_lang)
    selected_model = language_profile.gemini_structure_model or GEMINI_MENU_STRUCTURE_MODEL

    system_prompt = """
You are a strict restaurant menu layout reconstruction parser.
Return JSON only. Do not use markdown. Do not translate menu text.
Use OCR coordinates to reconstruct visual sections, columns, and item rows.
"""

    user_prompt = f"""
Target language code: {target_lang}
Target language name: {target_language_name}
Source language code: {source_lang}
Source language name: {source_language_name}

{language_context}

OCR blocks with coordinates:
{json.dumps(_compact_ocr_blocks(ocr_blocks), ensure_ascii=False)}

Layout rules:
- Return a flat menu_items array. Do not return nested sections.
- Every item must include its visible section in section_heading_original.
- Use coordinates to preserve columns, visual groups, section headings, item order, and page order.
- Assign each dish to the closest visible section heading above it in the same column/group/box.
- Do not infer categories from food type when a visible heading exists.
- Merge split section headings, e.g. "STARTERS +" plus "SNACKS" => "STARTERS + SNACKS".
- Never use price-only lines such as "9", "$14", or "22" as section headings or item names.
- If a decorative price appears under a real heading, keep the real heading and use the number as default item price when individual prices are missing.
- If a heading includes a section price, such as "VERDURAS 14", use "VERDURAS" as heading and "14" as default price.
- If one line contains multiple dish/price pairs, split them into separate items.
- Preserve original_name exactly as printed. Do not translate it.
- Preserve printed descriptions in description_original.
- Use null for missing prices. Do not invent prices.
- Omit translated_name, section_heading_translated, ingredients, allergens, image_prompt, and description unless they are explicitly printed.
- Extract the whole menu, including drinks, coffee, tea, dessert, brunch, sides, pastries, and happy hour.
- Exclude restaurant name, hours, footer notes, social media, policies, reservations, login, and cart text from menu_items.

{_menu_json_contract(target_lang, source_lang)}
"""

    content = _post_gemini_generate(
        system_prompt,
        user_prompt,
        max_output_tokens=LAYOUT_MAX_TOKENS,
        model=selected_model,
    )
    return _finalize_menu_result(
        _parse_gemini_json(content, "layout"),
        ocr_blocks=ocr_blocks,
        prompt_name="layout",
        analysis_model=selected_model,
    )
