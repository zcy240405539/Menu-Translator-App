import hashlib
from app.core.models import MenuParseCache


def calculate_image_hash(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()


def get_menu_cache(db, image_hash: str, target_lang: str):
    return (
        db.query(MenuParseCache)
        .filter(
            MenuParseCache.image_hash == image_hash,
            MenuParseCache.target_language == target_lang,
        )
        .first()
    )


def upsert_menu_cache(
    db,
    image_hash: str,
    target_lang: str,
    result: dict,
    ocr_blocks: list,
):
    existing = get_menu_cache(db, image_hash, target_lang)

    menu_items = result.get("menu_items", [])

    if existing:
        existing.source_language = result.get("source_language")
        existing.restaurant_type = result.get("restaurant_type")
        existing.business_name = result.get("business_name")
        existing.currency = result.get("currency")
        existing.business_description = result.get("business_description") or {}    
        existing.ocr_blocks = ocr_blocks
        existing.structure_result = result
        existing.menu_items = menu_items
        db.commit()
        db.refresh(existing)
        return existing

    record = MenuParseCache(
        image_hash=image_hash,
        target_language=target_lang,
        source_language=result.get("source_language"),
        restaurant_type=result.get("restaurant_type"),
        business_name=result.get("business_name"),
        currency=result.get("currency"),
        business_description=result.get("business_description") or {},
        ocr_blocks=ocr_blocks,
        structure_result=result,
        menu_items=menu_items,
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return record