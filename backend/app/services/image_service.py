import os
import re
import uuid
import base64
import requests
from concurrent.futures import ThreadPoolExecutor, TimeoutError, as_completed
from typing import Any
from supabase import create_client

from app.services.dish_cache_service import (
    build_normalized_dish_key,
    contains_chinese,
    is_cacheable_normalized_name,
    normalize_dish_name,
    resolve_dish_cuisine,
)
from app.services.app_config_service import get_config_map, get_config_set
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


def normalize_openai_image_model(model: str | None) -> str:
    value = (model or "gpt-image-1-mini").strip()
    if value.startswith(("gpt-image-", "dall-e-")) and ":" in value:
        return value.split(":", 1)[0]
    return value


OPENAI_IMAGE_MODEL = normalize_openai_image_model(os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-1-mini"))
ENABLE_GENERATED_IMAGE_FALLBACK = os.getenv(
    "ENABLE_GENERATED_IMAGE_FALLBACK",
    "true",
).lower() in {"1", "true", "yes"}
IMAGE_SEARCH_VERSION = "image-search-v3"
IMAGE_SEARCH_PER_SOURCE = max(1, int(os.getenv("IMAGE_SEARCH_PER_SOURCE", "4")))
IMAGE_SEARCH_MIN_SCORE = float(os.getenv("IMAGE_SEARCH_MIN_SCORE", "30"))
IMAGE_SEARCH_TIMEOUT_SECONDS = float(os.getenv("IMAGE_SEARCH_TIMEOUT_SECONDS", "5"))
IMAGE_SEARCH_REQUEST_TIMEOUT = float(os.getenv("IMAGE_SEARCH_REQUEST_TIMEOUT", "3.5"))
IMAGE_SEARCH_WORKERS = max(1, int(os.getenv("IMAGE_SEARCH_WORKERS", "8")))
IMAGE_DOWNLOAD_TIMEOUT_SECONDS = float(os.getenv("IMAGE_DOWNLOAD_TIMEOUT_SECONDS", "5"))
IMAGE_SEARCH_EARLY_SCORE = float(os.getenv("IMAGE_SEARCH_EARLY_SCORE", "78"))
OPENVERSE_API_URL = os.getenv("OPENVERSE_API_URL", "https://api.openverse.org/v1/images/")


supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def get_negative_image_terms() -> set[str]:
    return {value.lower() for value in get_config_set("negative_image_terms")}


def get_image_source_score_bonus() -> dict[str, float]:
    bonus = {}
    for key, value in get_config_map("image_source_score_bonus").items():
        try:
            bonus[key] = float(value)
        except (TypeError, ValueError):
            continue
    return bonus


def get_dish_search_aliases() -> dict[str, list[str]]:
    aliases = {}
    for key, value in get_config_map("dish_search_aliases").items():
        if isinstance(value, list):
            aliases[key.lower()] = [str(item).strip() for item in value if str(item).strip()]
        elif value:
            aliases[key.lower()] = [str(value).strip()]
    return aliases


def get_dish_image_conflict_terms() -> dict[str, list[str]]:
    conflicts = {}
    for key, value in get_config_map("dish_image_conflict_terms").items():
        if isinstance(value, list):
            conflicts[key.lower()] = [str(item).strip().lower() for item in value if str(item).strip()]
        elif value:
            conflicts[key.lower()] = [str(value).strip().lower()]
    return conflicts


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


def has_food_context(text_lower: str, cuisine: str) -> bool:
    food_terms = {
        "food",
        "dish",
        "cuisine",
        "meal",
        "plate",
        "plated",
        "restaurant",
        "sandwich",
        "toast",
        "pizza",
        "pasta",
        "noodle",
        "rice",
        "soup",
        "salad",
        "taco",
        "burger",
        "dumpling",
        "cake",
        "bread",
        "chicken",
        "beef",
        "pork",
        "fish",
        "seafood",
        "cheese",
        "sauce",
        "cocktail",
        "wine",
    }
    return any(term in text_lower for term in food_terms) or (
        cuisine != "Other" and cuisine.lower() in text_lower
    )


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

    search_candidates = [original, normalized]
    if not original:
        search_candidates.append(translated)

    names = []
    for name in search_candidates:
        if name and name.lower() not in {existing.lower() for existing in names}:
            names.append(name)

    lookup_text = " ".join(names).lower()
    for key, aliases in get_dish_search_aliases().items():
        if key in lookup_text:
            for alias in aliases:
                if alias and alias.lower() not in {existing.lower() for existing in names}:
                    names.append(alias)
    return names


def get_dish_evidence_tokens(dish: dict) -> set[str]:
    values: list[str] = []
    values.extend(get_dish_names_for_search(dish))
    values.extend(
        str(dish.get(key) or "")
        for key in (
            "description",
            "translated_description",
            "category",
            "section_heading_original",
        )
    )
    ingredients = dish.get("ingredients") or []
    if isinstance(ingredients, list):
        values.extend(str(item or "") for item in ingredients)
    else:
        values.append(str(ingredients or ""))

    tokens: set[str] = set()
    for value in values:
        tokens |= tokenize_for_image_match(value)
    return tokens


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

    return deduped[:6]


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
    exact_name_token_counts = []

    for name in names:
        if not name:
            continue
        name_lower = name.lower()
        if name_lower in title_lower:
            exact_name_hit = True
            exact_name_token_counts.append(len(tokenize_for_image_match(name)))
        name_tokens |= tokenize_for_image_match(name)

    candidate_tokens = tokenize_for_image_match(title)
    query_tokens = tokenize_for_image_match(query)
    overlap = fuzzy_token_overlap(name_tokens, candidate_tokens)
    cuisine = resolve_dish_cuisine(dish)
    lookup_text = " ".join(names).lower()
    evidence_overlap = fuzzy_token_overlap(get_dish_evidence_tokens(dish), candidate_tokens)

    source_score_bonus = get_image_source_score_bonus()
    score = source_score_bonus.get(source_type, 8)
    score += min(overlap, 6) * 7
    score += min(max(evidence_overlap - overlap, 0), 4) * 3
    if exact_name_hit:
        score += 34
    if cuisine != "Other" and cuisine.lower() in title_lower:
        score += 8
    if has_food_context(title_lower, cuisine):
        score += 6
    negative_image_terms = get_negative_image_terms()
    if any(term in title_lower for term in negative_image_terms):
        score -= 22
    for dish_key, conflict_terms in get_dish_image_conflict_terms().items():
        if dish_key in lookup_text and any(term in title_lower for term in conflict_terms):
            score -= 34
    if not exact_name_hit and overlap == 0 and len(query_tokens & candidate_tokens) < 2:
        score -= 16
    weak_single_word_match = exact_name_hit and max(exact_name_token_counts or [0]) <= 1
    if weak_single_word_match and evidence_overlap <= 1 and not has_food_context(title_lower, cuisine):
        score -= 38
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
        timeout=IMAGE_SEARCH_REQUEST_TIMEOUT,
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
        timeout=IMAGE_SEARCH_REQUEST_TIMEOUT,
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
            "gsrsearch": query,
            "gsrnamespace": 6,
            "gsrlimit": IMAGE_SEARCH_PER_SOURCE,
            "prop": "imageinfo",
            "iiprop": "url|mime",
            "iiurlwidth": 1024,
        },
        timeout=IMAGE_SEARCH_REQUEST_TIMEOUT,
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
        timeout=IMAGE_SEARCH_REQUEST_TIMEOUT,
    )

    if not res.ok:
        print("Openverse error:", res.status_code, res.text[:300])
        return []

    candidates = []
    for image in (res.json().get("results") or []):
        image_url = image.get("thumbnail") or image.get("url")
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

    executor = ThreadPoolExecutor(max_workers=IMAGE_SEARCH_WORKERS)
    future_map = {
        executor.submit(searcher, query): (searcher.__name__, query)
        for query in queries
        for searcher in searchers
    }

    try:
        for future in as_completed(future_map, timeout=IMAGE_SEARCH_TIMEOUT_SECONDS):
            searcher_name, query = future_map[future]
            try:
                candidates = future.result()
            except Exception as error:
                print(f"Image search failed for {searcher_name}: {error}")
                continue

            for candidate in candidates:
                score = score_image_candidate(candidate, dish, query)
                candidate["match_score"] = score
                if score > best_score:
                    best_candidate = candidate
                    best_query = query
                    best_score = score

            if best_score >= IMAGE_SEARCH_EARLY_SCORE:
                break
    except TimeoutError:
        print(
            "Image search timed out with partial results:",
            {"best_score": best_score, "best_query": best_query},
        )
    finally:
        executor.shutdown(wait=False, cancel_futures=True)

    if best_candidate and best_score >= IMAGE_SEARCH_MIN_SCORE:
        return best_candidate, best_query, best_score

    print(
        "No image candidate passed score threshold:",
        {"best_score": best_score, "best_query": best_query, "dish": dish.get("original_name")},
    )
    return None, best_query, best_score


def upload_remote_image_to_supabase(image_url: str, dish_name: str, source_folder="generated"):
    image_res = requests.get(image_url, timeout=IMAGE_DOWNLOAD_TIMEOUT_SECONDS)

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


def get_or_create_dish_image(
    db,
    dish: dict,
    normalized_name: str,
    force_refresh: bool = False,
    rejected_urls: list[str] | None = None
):
    normalized_name = normalize_dish_name(normalized_name)

    if not is_cacheable_normalized_name(normalized_name):
        return None

    dish = {**dish, "normalized_name": normalized_name}

    existing = (
        db.query(DishImage)
        .filter(DishImage.normalized_name == normalized_name)
        .first()
    )

    # Compile rejected URLs from database and parameter
    db_rejected = list(existing.rejected_urls or []) if (existing and existing.rejected_urls) else []
    param_rejected = rejected_urls or []
    all_rejected = list(set(db_rejected + param_rejected))

    queries = build_image_search_queries(dish)
    query = queries[0] if queries else build_image_search_query(dish)
    cache_prompt_candidates = {f"{IMAGE_SEARCH_VERSION}|{candidate}" for candidate in queries}

    # If cache is still valid and not rejected
    if existing and existing.image_url and not force_refresh and existing.image_prompt in cache_prompt_candidates:
        if existing.image_url not in all_rejected:
            existing.cuisine = resolve_dish_cuisine(dish)
            db.commit()
            return existing.image_url

    uploaded = None
    source_type = None
    matched_query = query

    # Step 1: Wikimedia Commons API using the original name in the menu's source language
    original_name = dish.get("original_name") or dish.get("name") or ""
    original_name = strip_menu_code_and_price(original_name).strip()

    if original_name:
        print(f"[ImageSearch] Step 1: Querying Wikimedia Commons for: {original_name}")
        try:
            wikimedia_candidates = search_wikimedia_images(original_name)
            best_cand = None
            best_score = -999.0
            for cand in wikimedia_candidates:
                url = cand.get("image_url")
                if all_rejected and url in all_rejected:
                    continue
                score = score_image_candidate(cand, dish, original_name)
                cand["match_score"] = score
                if score > best_score:
                    best_cand = cand
                    best_score = score
            
            if best_cand and best_score >= IMAGE_SEARCH_MIN_SCORE:
                uploaded = best_cand
                source_type = best_cand.get("source_type") or "wikimedia_found"
                matched_query = original_name
                print(f"[ImageSearch] Wikimedia success: {uploaded['image_url']} (score: {best_score})")
        except Exception as wikimedia_err:
            print(f"[ImageSearch] Wikimedia query failed: {wikimedia_err}")

    # Step 2: If Wikimedia Commons fails, query Pexels and Unsplash concurrently
    if not uploaded:
        print("[ImageSearch] Step 2: Querying Pexels and Unsplash concurrently")
        searchers = [search_pexels_images, search_unsplash_images]
        executor = ThreadPoolExecutor(max_workers=IMAGE_SEARCH_WORKERS)
        future_map = {
            executor.submit(searcher, q): (searcher.__name__, q)
            for q in queries
            for searcher in searchers
        }

        best_cand = None
        best_q = None
        best_score = -999.0

        try:
            for future in as_completed(future_map, timeout=IMAGE_SEARCH_TIMEOUT_SECONDS):
                searcher_name, q = future_map[future]
                try:
                    candidates = future.result()
                except Exception as error:
                    print(f"[ImageSearch] {searcher_name} query failed: {error}")
                    continue

                for candidate in candidates:
                    url = candidate.get("image_url")
                    if all_rejected and url in all_rejected:
                        continue
                    score = score_image_candidate(candidate, dish, q)
                    candidate["match_score"] = score
                    if score > best_score:
                        best_cand = candidate
                        best_q = q
                        best_score = score

                if best_score >= IMAGE_SEARCH_EARLY_SCORE:
                    break
        except TimeoutError:
            print("[ImageSearch] Pexels/Unsplash concurrent search timed out with partial results")
        finally:
            executor.shutdown(wait=False, cancel_futures=True)

        if best_cand and best_score >= IMAGE_SEARCH_MIN_SCORE:
            uploaded = best_cand
            source_type = best_cand.get("source_type") or "web_found"
            matched_query = best_q
            print(f"[ImageSearch] Pexels/Unsplash success: {uploaded['image_url']} (score: {best_score})")

            # Pexels images must be downloaded and uploaded to Supabase
            if source_type == "pexels_found":
                try:
                    sup_uploaded = upload_remote_image_to_supabase(
                        image_url=best_cand["image_url"],
                        dish_name=dish.get("original_name") or normalized_name,
                        source_folder="web_found",
                    )
                    sup_uploaded["source_type"] = source_type
                    uploaded = sup_uploaded
                except Exception as upload_err:
                    print(f"[ImageSearch] Uploading Pexels image to Supabase failed: {upload_err}")
                    pass

    # Step 3: If both fail, generate image via OpenAI DALL-E
    if not uploaded:
        print("[ImageSearch] Step 3: Generating dish image via OpenAI")
        generated = generate_dish_image_with_openai(dish)
        if generated:
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
        existing.rejected_urls = all_rejected
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
            rejected_urls=all_rejected,
        )
        db.add(record)

    db.commit()
    db.refresh(record)

    return record.image_url
