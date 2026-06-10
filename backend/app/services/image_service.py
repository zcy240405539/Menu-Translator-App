import os
import re
import uuid
import base64
import requests
from typing import Any
from supabase import create_client

from app.services.dish_cache_service import (
    build_normalized_dish_key,
    contains_chinese,
    is_cacheable_normalized_name,
    normalize_dish_name,
    resolve_dish_cuisine,
)
from app.core.models import DishImage


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "Dish_Images")
PEXELS_API_KEY = os.getenv("PEXELS_API_KEY")
UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY")
WIKIMEDIA_USER_AGENT = os.getenv(
    "WIKIMEDIA_USER_AGENT",
    "MenuTranslatorApp/1.0 (image-search)",
)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_IMAGE_MODEL = os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-1-mini")
ENABLE_GENERATED_IMAGE_FALLBACK = os.getenv(
    "ENABLE_GENERATED_IMAGE_FALLBACK",
    "true",
).lower() in {"1", "true", "yes"}
IMAGE_SEARCH_VERSION = "image-search-v3"
IMAGE_SEARCH_PER_SOURCE = max(1, int(os.getenv("IMAGE_SEARCH_PER_SOURCE", "4")))
IMAGE_SEARCH_MIN_SCORE = float(os.getenv("IMAGE_SEARCH_MIN_SCORE", "30"))
OPENVERSE_API_URL = os.getenv("OPENVERSE_API_URL", "https://api.openverse.org/v1/images/")

NEGATIVE_IMAGE_TERMS = {
    "chef",
    "cook",
    "cooking",
    "kitchen",
    "restaurant interior",
    "menu",
    "sign",
    "logo",
    "people",
    "person",
    "waiter",
    "waitress",
    "market",
    "ingredient",
    "raw",
}

SOURCE_SCORE_BONUS = {
    "wikimedia_found": 18,
    "openverse_found": 17,
    "pexels_found": 13,
    "unsplash_found": 10,
}

DISH_SEARCH_ALIASES = {
    "zhajiang noodles": ["zhajiangmian", "zha jiang mian", "noodles with soybean paste"],
    "old beijing zhajiang noodles": ["zhajiangmian", "zha jiang mian", "beijing noodles soybean paste"],
    "dan dan noodles": ["dandan noodles", "dan dan mian"],
    "beef noodle soup": ["niu rou mian", "taiwanese beef noodle soup"],
    "mapo tofu": ["ma po tofu", "mapo doufu"],
    "kung pao chicken": ["gong bao chicken"],
    "twice cooked pork": ["hui guo rou"],
    "soup dumplings": ["xiaolongbao", "xiao long bao"],
    "pork wontons": ["wontons", "huntun"],
    "scallion pancake": ["cong you bing", "green onion pancake"],
    "potstickers": ["guotie", "pan fried dumplings"],
    "char siu": ["chashu pork", "bbq pork"],
    "beef quesadilla": ["quesadilla beef"],
    "cheese quesadilla": ["quesadilla cheese"],
    "shrimp fajitas": ["fajitas shrimp"],
    "chicken fajitas": ["fajitas chicken"],
}


supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def slugify(text: str) -> str:
    text = (text or "").lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-") or str(uuid.uuid4())


def compact_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def strip_menu_code_and_price(name: str) -> str:
    name = compact_text(name)
    name = re.sub(r"^[A-Z]?\s*\d+[A-Z]?\s*[\.\-)]\s*", "", name, flags=re.IGNORECASE)
    name = re.sub(r"[$¥￥€£]\s*\d+(?:\.\d{1,2})?", "", name)
    name = re.sub(r"\b\d+(?:\.\d{1,2})?\s*(?:each|ea|份|个|pcs?)\b", "", name, flags=re.IGNORECASE)
    return compact_text(name)


def tokenize_for_image_match(text: str) -> set[str]:
    text = compact_text(text).lower()
    ascii_tokens = re.findall(r"[a-z][a-z0-9&'-]{2,}", text)
    chinese_tokens = re.findall(r"[\u4e00-\u9fff]{2,}", text)
    stop_words = {
        "and",
        "with",
        "the",
        "dish",
        "food",
        "restaurant",
        "close",
        "photo",
        "image",
        "cuisine",
        "style",
    }
    return {token.strip("&'-") for token in ascii_tokens if token not in stop_words} | set(chinese_tokens)


def fuzzy_token_overlap(left: set[str], right: set[str]) -> int:
    overlap = 0
    for token in left:
        if token in right:
            overlap += 1
            continue
        if len(token) < 5:
            continue
        if any(token in candidate or candidate in token for candidate in right if len(candidate) >= 5):
            overlap += 1
    return overlap


def get_dish_names_for_search(dish: dict) -> list[str]:
    original = strip_menu_code_and_price(dish.get("original_name") or dish.get("name") or "")
    translated = strip_menu_code_and_price(dish.get("translated_name") or "")
    normalized = strip_menu_code_and_price(
        dish.get("normalized_name")
        or build_normalized_dish_key(
            translated,
            original,
            dish.get("name"),
        )
    )

    names = []
    for name in [original, normalized, translated]:
        if name and name.lower() not in {existing.lower() for existing in names}:
            names.append(name)

    lookup_text = " ".join(names).lower()
    for key, aliases in DISH_SEARCH_ALIASES.items():
        if key in lookup_text:
            for alias in aliases:
                if alias and alias.lower() not in {existing.lower() for existing in names}:
                    names.append(alias)
    return names


def build_image_search_query(dish: dict) -> str:
    cuisine = resolve_dish_cuisine(dish)
    names = get_dish_names_for_search(dish)
    search_name = names[0] if names else "restaurant dish"

    dish_style = "Chinese dish" if contains_chinese(search_name) else ""

    parts = [
        search_name,
        dish_style,
        cuisine if cuisine != "Other" else "",
        "plated food",
    ]
    return " ".join(str(part).strip() for part in parts if part).strip()


def build_image_search_queries(dish: dict) -> list[str]:
    cuisine = resolve_dish_cuisine(dish)
    section = dish.get("section_heading_original") or dish.get("category") or ""
    names = get_dish_names_for_search(dish)

    queries = []
    for name in names:
        if cuisine != "Other":
            queries.append(f'"{name}" {cuisine} food')
            queries.append(f"{name} {cuisine} dish")
        queries.append(f'"{name}" dish')
        queries.append(f"{name} plated food")

    if cuisine != "Other" and section:
        queries.append(f"{cuisine} {section} dish")

    fallback = build_image_search_query(dish)
    if fallback:
        queries.append(fallback)

    deduped = []
    for query in queries:
        query = re.sub(r"\s+", " ", query).strip()
        if query and query.lower() not in {existing.lower() for existing in deduped}:
            deduped.append(query)

    return deduped[:8]


def score_image_candidate(candidate: dict, dish: dict, query: str) -> float:
    source_type = candidate.get("source_type") or ""
    title = compact_text(
        " ".join(
            str(part or "")
            for part in [
                candidate.get("title"),
                candidate.get("alt"),
                candidate.get("description"),
                " ".join(candidate.get("tags") or []),
                candidate.get("creator"),
            ]
        )
    )
    title_lower = title.lower()
    query_lower = query.lower()
    names = get_dish_names_for_search(dish)
    name_tokens = set()
    exact_name_hit = False

    for name in names:
        if not name:
            continue
        name_lower = name.lower()
        if name_lower in title_lower:
            exact_name_hit = True
        name_tokens |= tokenize_for_image_match(name)

    candidate_tokens = tokenize_for_image_match(title)
    query_tokens = tokenize_for_image_match(query)
    overlap = fuzzy_token_overlap(name_tokens, candidate_tokens)
    cuisine = resolve_dish_cuisine(dish)

    score = SOURCE_SCORE_BONUS.get(source_type, 8)
    score += min(overlap, 6) * 7
    if exact_name_hit:
        score += 34
    if cuisine != "Other" and cuisine.lower() in title_lower:
        score += 8
    if any(term in title_lower for term in ["food", "dish", "cuisine", "meal", "plate", "plated"]):
        score += 6
    if any(term in title_lower for term in NEGATIVE_IMAGE_TERMS):
        score -= 22
    if not exact_name_hit and overlap == 0 and len(query_tokens & candidate_tokens) < 2:
        score -= 16
    if candidate.get("width") and candidate.get("height"):
        try:
            width = float(candidate["width"])
            height = float(candidate["height"])
            if width >= 500 and height >= 350:
                score += 4
        except (TypeError, ValueError):
            pass

    return round(score, 2)


def make_image_candidate(
    *,
    image_url: str,
    source_type: str,
    title: str = "",
    page_url: str = "",
    creator: str = "",
    tags: list[str] | None = None,
    width: int | None = None,
    height: int | None = None,
    alt: str = "",
    description: str = "",
) -> dict:
    return {
        "image_url": image_url,
        "local_image_path": page_url or "",
        "source_type": source_type,
        "title": title or alt or description,
        "alt": alt,
        "description": description,
        "creator": creator,
        "tags": tags or [],
        "width": width,
        "height": height,
    }


def search_pexels_images(query: str) -> list[dict]:
    if not PEXELS_API_KEY:
        return []

    res = requests.get(
        "https://api.pexels.com/v1/search",
        headers={"Authorization": PEXELS_API_KEY},
        params={
            "query": query,
            "per_page": IMAGE_SEARCH_PER_SOURCE,
            "orientation": "landscape",
        },
        timeout=20,
    )

    if not res.ok:
        print("Pexels error:", res.status_code, res.text[:300])
        return []

    data = res.json()
    photos = data.get("photos") or []

    candidates = []
    for photo in photos:
        src = photo.get("src") or {}
        image_url = src.get("large") or src.get("original") or src.get("medium")
        if not image_url:
            continue
        candidates.append(
            make_image_candidate(
                image_url=image_url,
                source_type="pexels_found",
                title=photo.get("alt") or "",
                alt=photo.get("alt") or "",
                page_url=photo.get("url") or "",
                creator=(photo.get("photographer") or ""),
                width=photo.get("width"),
                height=photo.get("height"),
            )
        )
    return candidates


def search_unsplash_images(query: str) -> list[dict]:
    if not UNSPLASH_ACCESS_KEY:
        return []

    res = requests.get(
        "https://api.unsplash.com/search/photos",
        headers={
            "Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}",
            "Accept-Version": "v1",
        },
        params={
            "query": query,
            "per_page": IMAGE_SEARCH_PER_SOURCE,
            "orientation": "landscape",
            "content_filter": "high",
            "order_by": "relevant",
        },
        timeout=20,
    )

    if not res.ok:
        print("Unsplash error:", res.status_code, res.text[:300])
        return []

    data = res.json()
    results = data.get("results") or []

    candidates = []
    for photo in results:
        urls = photo.get("urls") or {}
        image_url = urls.get("regular") or urls.get("full") or urls.get("raw")
        if not image_url:
            continue
        tags = [tag.get("title") for tag in (photo.get("tags") or []) if tag.get("title")]
        candidates.append(
            make_image_candidate(
                image_url=image_url,
                source_type="unsplash_found",
                title=photo.get("alt_description") or photo.get("description") or "",
                alt=photo.get("alt_description") or "",
                description=photo.get("description") or "",
                page_url=(photo.get("links") or {}).get("html") or "",
                creator=(photo.get("user") or {}).get("name") or "",
                tags=tags,
                width=photo.get("width"),
                height=photo.get("height"),
            )
        )
    return candidates


def search_wikimedia_images(query: str) -> list[dict]:
    res = requests.get(
        "https://commons.wikimedia.org/w/api.php",
        headers={"User-Agent": WIKIMEDIA_USER_AGENT},
        params={
            "action": "query",
            "format": "json",
            "origin": "*",
            "generator": "search",
            "gsrsearch": f'{query} food dish filetype:bitmap',
            "gsrnamespace": 6,
            "gsrlimit": IMAGE_SEARCH_PER_SOURCE,
            "prop": "imageinfo",
            "iiprop": "url|mime",
            "iiurlwidth": 1024,
        },
        timeout=20,
    )

    if not res.ok:
        print("Wikimedia error:", res.status_code, res.text[:300])
        return []

    pages = (res.json().get("query") or {}).get("pages") or {}
    candidates = []
    for page in pages.values():
        image_info = (page.get("imageinfo") or [{}])[0]
        mime = image_info.get("mime") or ""
        if mime and not mime.startswith("image/"):
            continue

        image_url = (
            image_info.get("thumburl")
            or image_info.get("url")
        )
        if not image_url:
            continue

        candidates.append(
            make_image_candidate(
                image_url=image_url,
                source_type="wikimedia_found",
                title=(page.get("title") or "").replace("File:", ""),
                page_url=image_info.get("descriptionurl") or "",
            )
        )

    return candidates


def search_openverse_images(query: str) -> list[dict]:
    res = requests.get(
        OPENVERSE_API_URL,
        headers={"User-Agent": WIKIMEDIA_USER_AGENT},
        params={
            "q": query,
            "page_size": IMAGE_SEARCH_PER_SOURCE,
            "mature": "false",
            "license_type": "commercial,modification",
            "extension": "jpg,png,webp",
        },
        timeout=20,
    )

    if not res.ok:
        print("Openverse error:", res.status_code, res.text[:300])
        return []

    candidates = []
    for image in (res.json().get("results") or []):
        image_url = image.get("url") or image.get("thumbnail")
        if not image_url:
            continue
        tags = [
            tag.get("name")
            for tag in (image.get("tags") or [])
            if isinstance(tag, dict) and tag.get("name")
        ]
        candidates.append(
            make_image_candidate(
                image_url=image_url,
                source_type="openverse_found",
                title=image.get("title") or "",
                description=image.get("description") or "",
                page_url=image.get("foreign_landing_url") or "",
                creator=image.get("creator") or "",
                tags=tags,
                width=image.get("width"),
                height=image.get("height"),
            )
        )

    return candidates


def find_best_web_image(dish: dict, queries: list[str]) -> tuple[dict | None, str | None, float]:
    best_candidate = None
    best_query = None
    best_score = -999.0

    searchers = [
        search_openverse_images,
        search_wikimedia_images,
        search_pexels_images,
        search_unsplash_images,
    ]

    for query in queries:
        for searcher in searchers:
            try:
                candidates = searcher(query)
            except Exception as error:
                print(f"Image search failed for {searcher.__name__}: {error}")
                continue

            for candidate in candidates:
                score = score_image_candidate(candidate, dish, query)
                candidate["match_score"] = score
                if score > best_score:
                    best_candidate = candidate
                    best_query = query
                    best_score = score

        if best_score >= IMAGE_SEARCH_MIN_SCORE + 24:
            break

    if best_candidate and best_score >= IMAGE_SEARCH_MIN_SCORE:
        return best_candidate, best_query, best_score

    print(
        "No image candidate passed score threshold:",
        {"best_score": best_score, "best_query": best_query, "dish": dish.get("original_name")},
    )
    return None, best_query, best_score


def upload_remote_image_to_supabase(image_url: str, dish_name: str, source_folder="generated"):
    image_res = requests.get(image_url, timeout=30)

    if not image_res.ok:
        raise RuntimeError(f"Failed to download image: {image_res.status_code}")

    content_type = image_res.headers.get("content-type", "image/jpeg")

    ext = "jpg"
    if "png" in content_type:
        ext = "png"
    elif "webp" in content_type:
        ext = "webp"

    filename = f"{slugify(dish_name)}-{uuid.uuid4().hex[:8]}.{ext}"
    storage_path = f"{source_folder}/{filename}"

    supabase.storage.from_(SUPABASE_BUCKET).upload(
        storage_path,
        image_res.content,
        {
            "content-type": content_type,
            "upsert": "true",
        },
    )

    public_url = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(storage_path)

    return {
        "image_url": public_url,
        "local_image_path": storage_path,
    }


def upload_image_bytes_to_supabase(
    image_bytes: bytes,
    dish_name: str,
    content_type: str = "image/png",
    source_folder="generated",
):
    ext = "jpg"
    if "png" in content_type:
        ext = "png"
    elif "webp" in content_type:
        ext = "webp"

    filename = f"{slugify(dish_name)}-{uuid.uuid4().hex[:8]}.{ext}"
    storage_path = f"{source_folder}/{filename}"

    supabase.storage.from_(SUPABASE_BUCKET).upload(
        storage_path,
        image_bytes,
        {
            "content-type": content_type,
            "upsert": "true",
        },
    )

    public_url = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(storage_path)

    return {
        "image_url": public_url,
        "local_image_path": storage_path,
    }


def build_generated_image_prompt(dish: dict) -> str:
    source_name = dish.get("original_name") or dish.get("name") or ""
    english_name = dish.get("normalized_name") or build_normalized_dish_key(
        dish.get("translated_name"),
        dish.get("original_name"),
        dish.get("name"),
    )
    dish_name = strip_menu_code_and_price(source_name or english_name or dish.get("translated_name") or "restaurant dish")
    cuisine = resolve_dish_cuisine(dish)
    ingredients = ", ".join(dish.get("ingredients") or [])

    parts = [
        f"A realistic restaurant food photograph of the exact dish named {dish_name}",
        f"English reference name: {english_name}" if english_name and english_name != dish_name else "",
        f"{cuisine} cuisine" if cuisine != "Other" else "",
        f"visible ingredients: {ingredients}" if ingredients else "",
        "single plated dish, natural light, appetizing, no text, no menu, no people",
    ]
    return ". ".join(part for part in parts if part)[:1000]


def generate_dish_image_with_openai(dish: dict):
    if not ENABLE_GENERATED_IMAGE_FALLBACK or not OPENAI_API_KEY:
        return None

    prompt = build_generated_image_prompt(dish)
    try:
        res = requests.post(
            "https://api.openai.com/v1/images/generations",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": OPENAI_IMAGE_MODEL,
                "prompt": prompt,
                "size": "1024x1024",
                "quality": "low",
                "n": 1,
            },
            timeout=90,
        )

        if not res.ok:
            print("OpenAI image generation error:", res.status_code, res.text[:300])
            return None

        image_data = (res.json().get("data") or [{}])[0]
        if image_data.get("b64_json"):
            return {
                "bytes": base64.b64decode(image_data["b64_json"]),
                "content_type": "image/png",
                "prompt": prompt,
            }

        if image_data.get("url"):
            uploaded = upload_remote_image_to_supabase(
                image_data["url"],
                dish.get("original_name") or dish.get("translated_name") or "dish",
                source_folder="generated",
            )
            uploaded["prompt"] = prompt
            return uploaded

    except Exception as error:
        print("OpenAI image generation failed:", error)

    return None


def get_or_create_dish_image(db, dish: dict, normalized_name: str, force_refresh: bool = False):
    normalized_name = normalize_dish_name(normalized_name)

    if not is_cacheable_normalized_name(normalized_name):
        return None

    dish = {**dish, "normalized_name": normalized_name}

    existing = (
        db.query(DishImage)
        .filter(DishImage.normalized_name == normalized_name)
        .first()
    )

    queries = build_image_search_queries(dish)
    query = queries[0] if queries else build_image_search_query(dish)
    cache_prompt_candidates = {f"{IMAGE_SEARCH_VERSION}|{candidate}" for candidate in queries}

    if existing and existing.image_url and not force_refresh and existing.image_prompt in cache_prompt_candidates:
        existing.cuisine = resolve_dish_cuisine(dish)
        db.commit()
        return existing.image_url

    matched_query = query
    uploaded = None
    source_type = "web_found"

    web_candidate, matched_query, match_score = find_best_web_image(dish, queries)
    if web_candidate:
        uploaded = web_candidate
        source_type = web_candidate.get("source_type") or "web_found"
        print(
            "Selected dish image:",
            {
                "dish": dish.get("original_name") or normalized_name,
                "query": matched_query,
                "source": source_type,
                "score": match_score,
                "title": web_candidate.get("title"),
            },
        )

        if source_type == "pexels_found":
            uploaded = upload_remote_image_to_supabase(
                image_url=web_candidate["image_url"],
                dish_name=dish.get("original_name") or normalized_name,
                source_folder="web_found",
            )
            uploaded["source_type"] = source_type
    elif existing and existing.image_url and not force_refresh:
        existing.cuisine = resolve_dish_cuisine(dish)
        db.commit()
        return existing.image_url
    else:
        generated = generate_dish_image_with_openai(dish)
        if not generated:
            return None

        if generated.get("bytes"):
            uploaded = upload_image_bytes_to_supabase(
                image_bytes=generated["bytes"],
                dish_name=dish.get("original_name") or normalized_name,
                content_type=generated.get("content_type") or "image/png",
                source_folder="generated",
            )
        else:
            uploaded = generated

        matched_query = generated.get("prompt") or query
        source_type = "generated_ai"

    if uploaded is None:
        return None

    if source_type not in {"unsplash_found", "wikimedia_found", "openverse_found"} and not uploaded.get("local_image_path"):
        uploaded["local_image_path"] = ""

    # Search API results should keep their source image URLs.
    uploaded["thumbnail_url"] = uploaded["image_url"]
    stored_prompt = f"{IMAGE_SEARCH_VERSION}|{matched_query}"

    if existing:
        existing.original_name = dish.get("original_name")
        existing.cuisine = resolve_dish_cuisine(dish)
        existing.image_url = uploaded["image_url"]
        existing.local_image_path = uploaded["local_image_path"]
        existing.thumbnail_url = uploaded["image_url"]
        existing.image_prompt = stored_prompt
        existing.source_type = source_type
        record = existing
    else:
        record = DishImage(
            normalized_name=normalized_name,
            original_name=dish.get("original_name"),
            cuisine=resolve_dish_cuisine(dish),
            image_url=uploaded["image_url"],
            local_image_path=uploaded["local_image_path"],
            thumbnail_url=uploaded["image_url"],
            image_prompt=stored_prompt,
            source_type=source_type,
        )
        db.add(record)

    db.commit()
    db.refresh(record)

    return record.image_url
