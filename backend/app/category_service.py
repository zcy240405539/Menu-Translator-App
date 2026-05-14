import re
from app.models import MenuCategory


def normalize_category_key(label: str) -> str:
    text = (label or "").strip().lower()
    text = text.replace("&", "and")
    text = re.sub(r"[^a-z0-9\u4e00-\u9fff]+", "_", text)
    return text.strip("_") or "other"


def translate_category_label(original_label: str, target_language: str) -> str:
    return original_label or ""


def get_or_create_menu_category(
    db,
    original_label: str,
    source_language: str,
    target_language: str,
    translate_func=None,
):
    key = normalize_category_key(original_label)

    existing = (
        db.query(MenuCategory)
        .filter(
            MenuCategory.normalized_key == key,
            MenuCategory.target_language == target_language,
        )
        .first()
    )

    if existing:
        return existing

    translated_label = (
        translate_func(original_label, target_language)
        if translate_func
        else translate_category_label(original_label, target_language)
    )

    category = MenuCategory(
        normalized_key=key,
        original_label=original_label,
        source_language=source_language,
        target_language=target_language,
        translated_label=translated_label,
    )

    db.add(category)
    db.commit()
    db.refresh(category)

    return category