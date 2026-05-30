import os
import re
import uuid
import base64
import requests
from supabase import create_client

from app.dish_cache_service import (
    build_normalized_dish_key,
    contains_chinese,
    is_cacheable_normalized_name,
    normalize_dish_name,
    resolve_dish_cuisine,
)
from  app.models import DishImage


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


supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def slugify(text: str) -> str:
    text = (text or "").lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-") or str(uuid.uuid4())


def build_image_search_query(dish: dict) -> str:
    original = dish.get("original_name") or dish.get("name") or ""
    translated = dish.get("translated_name") or ""
    normalized = dish.get("normalized_name") or build_normalized_dish_key(
        translated,
        original,
        dish.get("name"),
    )
    cuisine = resolve_dish_cuisine(dish)
    section = dish.get("section_heading_original") or dish.get("category") or ""
    ingredients = ", ".join(dish.get("ingredients") or [])

    search_name = original or translated or normalized

    dish_style = "Chinese dish" if contains_chinese(original) else ""

    parts = [
        search_name,
        dish_style,
        cuisine,
        section,
        ingredients,
        "restaurant dish close-up",
    ]
    return " ".join(str(part).strip() for part in parts if part).strip()


def build_image_search_queries(dish: dict) -> list[str]:
    original = dish.get("original_name") or dish.get("name") or ""
    translated = dish.get("translated_name") or ""
    normalized = dish.get("normalized_name") or build_normalized_dish_key(
        translated,
        original,
        dish.get("name"),
    )
    cuisine = resolve_dish_cuisine(dish)
    section = dish.get("section_heading_original") or dish.get("category") or ""

    names = []
    for name in [original, normalized, translated]:
        if name and name not in names:
            names.append(name)

    queries = []
    for name in names:
        queries.append(f"{name} {cuisine} restaurant dish")
        queries.append(f"{name} food close up")

    if cuisine != "Other" and section:
        queries.append(f"{cuisine} {section} restaurant food")

    fallback = build_image_search_query(dish)
    if fallback:
        queries.append(fallback)

    deduped = []
    for query in queries:
        query = re.sub(r"\s+", " ", query).strip()
        if query and query.lower() not in {existing.lower() for existing in deduped}:
            deduped.append(query)

    return deduped[:4]


def search_pexels_image(query: str):
    if not PEXELS_API_KEY:
        return None

    res = requests.get(
        "https://api.pexels.com/v1/search",
        headers={"Authorization": PEXELS_API_KEY},
        params={
            "query": query,
            "per_page": 1,
            "orientation": "landscape",
        },
        timeout=20,
    )

    if not res.ok:
        print("Pexels error:", res.status_code, res.text[:300])
        return None

    data = res.json()
    photos = data.get("photos") or []

    if not photos:
        return None

    return photos[0]["src"].get("large") or photos[0]["src"].get("original")


def search_unsplash_image(query: str):
    if not UNSPLASH_ACCESS_KEY:
        return None

    res = requests.get(
        "https://api.unsplash.com/search/photos",
        headers={
            "Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}",
            "Accept-Version": "v1",
        },
        params={
            "query": query,
            "per_page": 1,
            "orientation": "landscape",
            "content_filter": "high",
            "order_by": "relevant",
        },
        timeout=20,
    )

    if not res.ok:
        print("Unsplash error:", res.status_code, res.text[:300])
        return None

    data = res.json()
    results = data.get("results") or []

    if not results:
        return None

    photo = results[0]
    urls = photo.get("urls") or {}
    return {
        "image_url": urls.get("regular") or urls.get("full") or urls.get("raw"),
        "local_image_path": photo.get("links", {}).get("html"),
        "source_type": "unsplash_found",
    }


def search_wikimedia_image(query: str):
    res = requests.get(
        "https://commons.wikimedia.org/w/api.php",
        headers={"User-Agent": WIKIMEDIA_USER_AGENT},
        params={
            "action": "query",
            "format": "json",
            "origin": "*",
            "generator": "search",
            "gsrsearch": f'{query} filetype:bitmap',
            "gsrnamespace": 6,
            "gsrlimit": 5,
            "prop": "imageinfo",
            "iiprop": "url|mime",
            "iiurlwidth": 1024,
        },
        timeout=20,
    )

    if not res.ok:
        print("Wikimedia error:", res.status_code, res.text[:300])
        return None

    pages = (res.json().get("query") or {}).get("pages") or {}
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

        return {
            "image_url": image_url,
            "local_image_path": image_info.get("descriptionurl"),
            "source_type": "wikimedia_found",
        }

    return None


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
    dish_name = source_name or english_name or dish.get("translated_name") or "restaurant dish"
    cuisine = resolve_dish_cuisine(dish)
    ingredients = ", ".join(dish.get("ingredients") or [])

    parts = [
        f"A realistic restaurant food photograph of the source-language dish {dish_name}",
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

    if existing and existing.image_url and not force_refresh and existing.image_prompt == query:
        existing.cuisine = resolve_dish_cuisine(dish)
        db.commit()
        return existing.image_url

    found_url = None
    matched_query = query
    source_type = "web_found"
    for candidate_query in queries:
        found_url = search_pexels_image(candidate_query)
        if found_url:
            matched_query = candidate_query
            break

    uploaded = None

    if found_url:
        uploaded = upload_remote_image_to_supabase(
            image_url=found_url,
            dish_name=dish.get("original_name") or normalized_name,
            source_folder="web_found",
        )
    else:
        for candidate_query in queries:
            uploaded = search_unsplash_image(candidate_query)
            if uploaded and uploaded.get("image_url"):
                matched_query = candidate_query
                source_type = uploaded.get("source_type") or "unsplash_found"
                break

        if not uploaded:
            for candidate_query in queries:
                uploaded = search_wikimedia_image(candidate_query)
                if uploaded and uploaded.get("image_url"):
                    matched_query = candidate_query
                    source_type = uploaded.get("source_type") or "wikimedia_found"
                    break

        if not uploaded and existing and existing.image_url and existing.image_prompt in queries:
            existing.cuisine = resolve_dish_cuisine(dish)
            db.commit()
            return existing.image_url
        elif not uploaded:
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

    if source_type not in {"unsplash_found", "wikimedia_found"} and not uploaded.get("local_image_path"):
        uploaded["local_image_path"] = ""

    # Unsplash and Wikimedia API results should keep their source image URLs.
    uploaded["thumbnail_url"] = uploaded["image_url"]

    if existing:
        existing.original_name = dish.get("original_name")
        existing.cuisine = resolve_dish_cuisine(dish)
        existing.image_url = uploaded["image_url"]
        existing.local_image_path = uploaded["local_image_path"]
        existing.thumbnail_url = uploaded["image_url"]
        existing.image_prompt = matched_query
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
            image_prompt=matched_query,
            source_type=source_type,
        )
        db.add(record)

    db.commit()
    db.refresh(record)

    return record.image_url
