import re
from sqlalchemy.exc import IntegrityError
from app.core.models import MenuCategory


def normalize_category_key(label: str) -> str:
    text = (label or "").strip().lower()
    alpha_tokens = re.findall(r"[a-z]+", text)
    if len(alpha_tokens) >= 3 and all(len(token) == 1 for token in alpha_tokens):
        return "".join(alpha_tokens)

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
    commit: bool = True,
):
    key = normalize_category_key(original_label)

    translated_label = (
        translate_func(original_label, target_language)
        if translate_func
        else translate_category_label(original_label, target_language)
    )

    if not translated_label:
        translated_label = original_label

    existing = (
        db.query(MenuCategory)
        .filter(
            MenuCategory.normalized_key == key,
            MenuCategory.original_label == original_label,
            MenuCategory.target_language == target_language,
        )
        .first()
    )

    if existing:
        if translated_label and translated_label != original_label:
            existing.translated_label = translated_label
            existing.source_language = source_language
            if commit:
                db.commit()
                db.refresh(existing)
            else:
                db.flush()

        return existing

    category = MenuCategory(
        normalized_key=key,
        original_label=original_label,
        source_language=source_language,
        target_language=target_language,
        translated_label=translated_label,
    )

    db.add(category)
    try:
        if commit:
            db.commit()
            db.refresh(category)
        else:
            db.flush()
    except IntegrityError:
        db.rollback()

        existing = (
            db.query(MenuCategory)
            .filter(
                MenuCategory.normalized_key == key,
                MenuCategory.original_label == original_label,
                MenuCategory.target_language == target_language,
            )
            .first()
        )

        if not existing:
            raise

        existing.original_label = original_label or existing.original_label
        existing.source_language = source_language
        existing.target_language = target_language
        if translated_label:
            existing.translated_label = translated_label

        if commit:
            db.commit()
            db.refresh(existing)
        else:
            db.flush()
        return existing

    return category
