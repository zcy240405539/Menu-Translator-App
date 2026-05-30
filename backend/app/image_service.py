import os
import re
import uuid
import requests
from supabase import create_client

from app.dish_cache_service import (
    is_cacheable_normalized_name,
    normalize_dish_name,
)
from  app.models import DishImage


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "Dish_Images")
PEXELS_API_KEY = os.getenv("PEXELS_API_KEY")


supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def slugify(text: str) -> str:
    text = (text or "").lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-") or str(uuid.uuid4())


def build_image_search_query(dish: dict) -> str:
    original = dish.get("original_name") or dish.get("name") or ""
    translated = dish.get("translated_name") or ""
    cuisine = dish.get("cuisine") or ""
    section = dish.get("section_heading_original") or dish.get("category") or ""
    ingredients = ", ".join(dish.get("ingredients") or [])

    if re.search(r"[\u4e00-\u9fff]", original) and translated:
        search_name = translated
    else:
        search_name = original or translated

    dish_style = "Chinese dish" if re.search(r"[\u4e00-\u9fff]", original) else ""

    parts = [
        search_name,
        dish_style,
        cuisine,
        section,
        ingredients,
        "restaurant dish close-up",
    ]
    return " ".join(str(part).strip() for part in parts if part).strip()


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


def get_or_create_dish_image(db, dish: dict, normalized_name: str, force_refresh: bool = False):
    normalized_name = normalize_dish_name(normalized_name)

    if not is_cacheable_normalized_name(normalized_name):
        return None

    existing = (
        db.query(DishImage)
        .filter(DishImage.normalized_name == normalized_name)
        .first()
    )

    query = build_image_search_query(dish)

    if existing and existing.image_url and not force_refresh and existing.image_prompt == query:
        return existing.image_url

    found_url = search_pexels_image(query)

    if not found_url:
        if existing and existing.image_url and existing.image_prompt == query:
            return existing.image_url
        return None

    uploaded = upload_remote_image_to_supabase(
        image_url=found_url,
        dish_name=dish.get("original_name") or normalized_name,
        source_folder="generated",
    )

    if existing:
        existing.original_name = dish.get("original_name")
        existing.cuisine = dish.get("cuisine")
        existing.image_url = uploaded["image_url"]
        existing.local_image_path = uploaded["local_image_path"]
        existing.thumbnail_url = uploaded["image_url"]
        existing.image_prompt = query
        existing.source_type = "web_found"
        record = existing
    else:
        record = DishImage(
            normalized_name=normalized_name,
            original_name=dish.get("original_name"),
            cuisine=dish.get("cuisine"),
            image_url=uploaded["image_url"],
            local_image_path=uploaded["local_image_path"],
            thumbnail_url=uploaded["image_url"],
            image_prompt=query,
            source_type="web_found",
        )
        db.add(record)

    db.commit()
    db.refresh(record)

    return record.image_url
