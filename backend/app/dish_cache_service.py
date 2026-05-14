import re
import unicodedata
from  app.models import DishCache, DishImage


def normalize_dish_name(name: str) -> str:
    if not name:
        return ""

    text = name.lower().strip()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))

    text = re.sub(r"[^a-z0-9\s&+\-]", " ", text)
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def apply_cache_to_items(db, menu_items, target_lang):
    enriched_items = []
    missing_items = []

    for item in menu_items:
        original_name = item.get("original_name", "")
        normalized_name = normalize_dish_name(original_name)

        cached_dish = (
            db.query(DishCache)
            .filter(
                DishCache.normalized_name == normalized_name,
                DishCache.target_language == target_lang,
            )
            .first()
        )

        cached_image = (
            db.query(DishImage)
            .filter(DishImage.normalized_name == normalized_name)
            .first()
        )

        if cached_dish:
            item["translated_name"] = cached_dish.translated_name
            item["description"] = cached_dish.description
            item["ingredients"] = cached_dish.ingredients or []
            item["allergens"] = cached_dish.allergens or []
            item["spicy_level"] = cached_dish.spicy_level or 0
            item["image_prompt"] = cached_dish.image_prompt
            item["cuisine"] = cached_dish.cuisine
            item["cache_hit"] = True
        else:
            item["cache_hit"] = False
            missing_items.append(item)

        if cached_image:
            item["image_url"] = cached_image.image_url
            item["thumbnail_url"] = cached_image.thumbnail_url
            item["image_source"] = cached_image.source_type

        enriched_items.append(item)

    return enriched_items, missing_items


def upsert_dish_cache(db, dish, target_lang):
    original_name = dish.get("original_name", "")
    normalized_name = normalize_dish_name(original_name)

    if not normalized_name:
        return

    existing = (
        db.query(DishCache)
        .filter(
            DishCache.normalized_name == normalized_name,
            DishCache.target_language == target_lang,
        )
        .first()
    )

    if existing:
        existing.translated_name = dish.get("translated_name")
        existing.description = dish.get("description")
        existing.ingredients = dish.get("ingredients") or []
        existing.allergens = dish.get("allergens") or []
        existing.spicy_level = dish.get("spicy_level") or 0
        existing.image_prompt = dish.get("image_prompt")
        existing.cuisine = dish.get("cuisine")
    else:
        db.add(
            DishCache(
                normalized_name=normalized_name,
                original_name=original_name,
                source_language=dish.get("source_language"),
                target_language=target_lang,
                translated_name=dish.get("translated_name"),
                description=dish.get("description"),
                ingredients=dish.get("ingredients") or [],
                allergens=dish.get("allergens") or [],
                spicy_level=dish.get("spicy_level") or 0,
                image_prompt=dish.get("image_prompt"),
                cuisine=dish.get("cuisine"),
            )
        )

    db.commit()