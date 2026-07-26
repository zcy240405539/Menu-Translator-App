from app.language_modules.base import LanguageProfile


PROFILE = LanguageProfile(
    code="ru",
    family="cyrillic",
    display_name="Russian",
    aliases=("russian", "русский", "ru-ru"),
    local_ocr_lang="cyrillic",
    openrouter_layout_model_env="OPENROUTER_LAYOUT_MODEL_RU",
    gemini_structure_model_env="GEMINI_MENU_STRUCTURE_MODEL_RU",
    ocr_rules=(
        "Preserve Cyrillic letters, ё, abbreviations, and mixed Latin product names.",
        "Treat dietary marks, weights, and serving yields as item metadata.",
    ),
    layout_rules=(
        "Group items under headings such as Закуски, Салаты, Супы, Горячие блюда, Десерты, and Напитки.",
        "Keep weight and yield columns attached to the dish in the same row.",
    ),
    price_rules=(
        "Recognize ₽, руб., р., comma decimals, and space-grouped prices.",
        "Do not confuse gram weights or dish numbers with prices.",
    ),
    currency_markers=("₽", "руб.", "р."),
    unit_rules=("Treat порция, шт., г, кг, мл, л, стакан, and бутылка as units.",),
    section_noise_rules=("Exclude часы работы, адрес, телефон, бронирование, service fees, and allergen notices."),
    section_terms=("закуски", "салаты", "супы", "горячие блюда", "гарниры", "десерты", "напитки"),
    cuisine_hints=("Use dish evidence such as борщ, пельмени, блины, солянка, котлета, and пирожки."),
    detection_stopwords=("и", "с", "закуски", "салаты", "супы", "блюда", "гарниры", "десерты", "напитки"),
    detection_regexes=(r"(?:закуски|салаты|супы|горячие блюда|гарниры|десерты|напитки)", r"(?:₽|руб\.?|р\.)"),
    default_noise_keywords=("часы работы", "адрес", "телефон", "бронирование", "сервисный сбор", "аллергены"),
    default_unit_terms=(("порция", "portion"), ("шт", "piece"), ("стакан", "glass"), ("бутылка", "bottle")),
)
