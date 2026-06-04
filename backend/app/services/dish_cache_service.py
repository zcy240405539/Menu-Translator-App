import re
import unicodedata
from app.core.models import DishCache, DishImage


KNOWN_CUISINES = {
    "american": "American",
    "chinese": "Chinese",
    "french": "French",
    "indian": "Indian",
    "italian": "Italian",
    "japanese": "Japanese",
    "korean": "Korean",
    "mexican": "Mexican",
    "thai": "Thai",
    "vietnamese": "Vietnamese",
}

CUISINE_KEYWORDS = {
    "Mexican": [
        r"\btacos?\b",
        r"\bfajitas?\b",
        r"\bquesadillas?\b",
        r"\bnachos?\b",
        r"\btostadas?\b",
        r"\bburritos?\b",
        r"\benchiladas?\b",
        r"\bcarnitas?\b",
        r"\bcarne asada\b",
        r"\bal pastor\b",
        r"\bchile rellenos?\b",
        r"\bchimichangas?\b",
        r"\bsopapillas?\b",
        r"\bguacamole\b",
        r"\bpico de gallo\b",
        r"\bjalape[nñ]os?\b",
        r"\btortillas?\b",
        r"\brefried beans?\b",
        r"\bdiabla\b",
        r"\bacapulco\b",
        r"\bjuan'?s favorite\b",
    ],
    "Italian": [
        r"\bpizzas?\b",
        r"\bpastas?\b",
        r"\bravioli\b",
        r"\blasagn[ae]\b",
        r"\brisotto\b",
        r"\bgnocchi\b",
        r"\bmozzarella\b",
        r"\bbruschetta\b",
        r"\bparmigiana\b",
        r"\bmarinara\b",
    ],
    "Chinese": [
        r"\bdumplings?\b",
        r"\bwontons?\b",
        r"\bchow mein\b",
        r"\bfried rice\b",
        r"\bkung pao\b",
        r"\bszechuan\b",
        r"\bsichuan\b",
        r"\bzhajiang\b",
    ],
    "Japanese": [
        r"\bsushi\b",
        r"\bsashimi\b",
        r"\bramen\b",
        r"\budon\b",
        r"\btempura\b",
        r"\bteriyaki\b",
    ],
    "Korean": [
        r"\bbulgogi\b",
        r"\bbibimbap\b",
        r"\bkimchi\b",
        r"\btteokbokki\b",
        r"\bkorean\b",
    ],
    "Thai": [
        r"\bpad thai\b",
        r"\btom yum\b",
        r"\btom kha\b",
        r"\bthai\b",
        r"\bgreen curry\b",
        r"\bred curry\b",
    ],
    "Indian": [
        r"\bcurry\b",
        r"\btikka\b",
        r"\bmasala\b",
        r"\bbiryani\b",
        r"\bnaan\b",
        r"\bsamosas?\b",
        r"\btandoori\b",
    ],
    "Vietnamese": [
        r"\bpho\b",
        r"\bbanh mi\b",
        r"\bbún\b",
        r"\bvermicelli\b",
        r"\bspring rolls?\b",
    ],
    "American": [
        r"\bburgers?\b",
        r"\bcheeseburgers?\b",
        r"\bbaconator\b",
        r"\bnuggets?\b",
        r"\bwaffles?\b",
        r"\bomelets?\b",
        r"\bfrench toast\b",
        r"\bhot dogs?\b",
    ],
}


NON_CACHEABLE_NORMALIZED_NAMES = {
    "",
    "empty",
    "null",
    "none",
    "unknown",
    "undefined",
    "n/a",
    "na",
    "dish",
    "item",
    "menu item",
}


def normalize_dish_name(name: str) -> str:
    if not name:
        return ""

    text = unicodedata.normalize("NFKC", str(name)).lower().strip()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))

    text = re.sub(r"[^a-z0-9\s&+\-]", " ", text)
    text = re.sub(r"\s+", " ", text)

    normalized = text.strip()
    if normalized in NON_CACHEABLE_NORMALIZED_NAMES:
        return ""

    return normalized


def is_cacheable_normalized_name(normalized_name: str) -> bool:
    normalized_name = normalize_dish_name(normalized_name)
    return bool(
        normalized_name
        and normalized_name not in NON_CACHEABLE_NORMALIZED_NAMES
        and re.search(r"[a-z]", normalized_name)
        and not contains_chinese(normalized_name)
    )


def build_normalized_dish_key(*names: str) -> str:
    normalized_candidates = []

    for name in names:
        normalized_name = normalize_dish_name(name)
        if is_cacheable_normalized_name(normalized_name):
            normalized_candidates.append(normalized_name)

    if not normalized_candidates:
        return ""

    for normalized_name in normalized_candidates:
        if not contains_chinese(normalized_name) and re.search(r"[a-z]", normalized_name):
            return normalized_name

    return normalized_candidates[0]


def apply_cache_to_items(db, menu_items, target_lang):
    enriched_items = []
    missing_items = []

    for item in menu_items:
        original_name = item.get("original_name", "")
        normalized_name = build_normalized_dish_key(
            original_name,
            item.get("translated_name"),
            item.get("name"),
        )
        is_cacheable = is_cacheable_normalized_name(normalized_name)

        cached_dish = None
        cached_image = None

        if is_cacheable:
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


def contains_chinese(text: str) -> bool:
    return bool(text and re.search(r"[\u4e00-\u9fff]", str(text)))


def ensure_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        return [x.strip() for x in re.split(r"[,;，；]", value) if x.strip()]
    return [value]


def normalize_cuisine(cuisine: str) -> str:
    if not cuisine:
        return "Other"

    cuisine = str(cuisine).strip()

    if contains_chinese(cuisine):
        return "Other"

    lowered = re.sub(r"\s+", " ", cuisine.lower()).strip()
    return KNOWN_CUISINES.get(lowered, cuisine.title())


def infer_cuisine_from_text(text: str) -> str:
    if not text:
        return "Other"

    haystack = str(text).lower()

    for cuisine, patterns in CUISINE_KEYWORDS.items():
        if any(re.search(pattern, haystack, re.IGNORECASE) for pattern in patterns):
            return cuisine

    return "Other"


def infer_menu_cuisine(menu_items: list[dict], restaurant_type: str = "", business_name: str = "") -> str:
    score_by_cuisine = {}

    context_parts = [restaurant_type, business_name]
    for item in menu_items or []:
        context_parts.extend(
            [
                item.get("original_name"),
                item.get("translated_name"),
                item.get("category"),
                item.get("section_heading_original"),
                item.get("description"),
                " ".join(ensure_list(item.get("ingredients"))),
            ]
        )

    context = " ".join(str(part) for part in context_parts if part)

    for cuisine, patterns in CUISINE_KEYWORDS.items():
        score = sum(
            1
            for pattern in patterns
            if re.search(pattern, context, re.IGNORECASE)
        )
        if score:
            score_by_cuisine[cuisine] = score

    if not score_by_cuisine:
        normalized_context_cuisine = normalize_cuisine(restaurant_type)
        return normalized_context_cuisine if normalized_context_cuisine != "Other" else "Other"

    cuisine, score = max(score_by_cuisine.items(), key=lambda pair: pair[1])
    return cuisine if score >= 2 else "Other"


def resolve_dish_cuisine(dish: dict, menu_cuisine: str = "") -> str:
    original_name = dish.get("original_name") or dish.get("name") or ""
    dish_context = " ".join(
        str(part)
        for part in [
            original_name,
            dish.get("translated_name"),
            dish.get("category"),
            dish.get("section_heading_original"),
            dish.get("description"),
            " ".join(ensure_list(dish.get("ingredients"))),
            dish.get("image_prompt"),
        ]
        if part
    )
    dish_inferred = infer_cuisine_from_text(dish_context)

    if dish_inferred != "Other":
        return dish_inferred

    if contains_chinese(original_name):
        return "Chinese"

    normalized_existing = normalize_cuisine(dish.get("cuisine"))
    if normalized_existing != "Other":
        return normalized_existing

    normalized_menu = normalize_cuisine(menu_cuisine)
    if normalized_menu != "Other":
        return normalized_menu

    return "Other"


def upsert_dish_cache(db, dish, target_lang):
    original_name = dish.get("original_name", "")
    normalized_name = build_normalized_dish_key(
        original_name,
        dish.get("translated_name"),
        dish.get("name"),
    )

    if not is_cacheable_normalized_name(normalized_name):
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
        existing.ingredients = ensure_list(dish.get("ingredients"))
        existing.allergens = ensure_list(dish.get("allergens"))
        existing.spicy_level = dish.get("spicy_level") or 0
        existing.image_prompt = dish.get("image_prompt")
        existing.cuisine = normalize_cuisine(dish.get("cuisine"))
    else:
        db.add(
            DishCache(
                normalized_name=normalized_name,
                original_name=original_name,
                source_language=dish.get("source_language"),
                target_language=target_lang,
                translated_name=dish.get("translated_name"),
                description=dish.get("description"),
                ingredients=ensure_list(dish.get("ingredients")),
                allergens=ensure_list(dish.get("allergens")),
                spicy_level=dish.get("spicy_level") or 0,
                image_prompt=dish.get("image_prompt"),
                cuisine=normalize_cuisine(dish.get("cuisine")),
            )
        )

    db.commit()

