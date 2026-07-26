from app.language_modules.base import LanguageProfile


PROFILE = LanguageProfile(
    code="it",
    family="latin",
    display_name="Italian",
    aliases=("italian", "italiano", "it-it"),
    local_ocr_lang="latin",
    openrouter_layout_model_env="OPENROUTER_LAYOUT_MODEL_IT",
    gemini_structure_model_env="GEMINI_MENU_STRUCTURE_MODEL_IT",
    ocr_rules=(
        "Preserve Italian accents, apostrophes, regional dish names, and DOP or IGP marks.",
        "Treat allergen numbers and vegetarian symbols as item metadata.",
    ),
    layout_rules=(
        "Group dishes under Antipasti, Primi, Secondi, Contorni, Dolci, and Bevande.",
        "Keep pizza size, pasta type, tasting-menu course, and coperto notes with the relevant item.",
    ),
    price_rules=(
        "Recognize euro prices with comma decimals and prices printed without a currency sign.",
        "Do not use a standalone price or allergen number as a section heading.",
    ),
    currency_markers=("€", "EUR"),
    unit_rules=("Treat porzione, bicchiere, bottiglia, pezzo, calice, and coperto as units or options.",),
    section_noise_rules=("Exclude orari, indirizzo, telefono, prenotazioni, coperto notices, and allergen notices."),
    section_terms=("antipasti", "primi", "secondi", "contorni", "pizze", "dolci", "bevande", "vini"),
    cuisine_hints=("Use dish evidence such as risotto, carbonara, lasagna, gnocchi, burrata, tiramisù, and pizza."),
    detection_stopwords=("con", "di", "del", "antipasti", "primi", "secondi", "contorni", "pizze", "dolci", "bevande", "vini"),
    detection_regexes=(
        r"\b(?:antipasti|primi|secondi|contorni|pizze|dolci|bevande|vini)\b",
        r"\b(?:risotto|carbonara|gnocchi|burrata|tiramisù|parmigiano)\b",
    ),
    default_noise_keywords=("orari", "indirizzo", "telefono", "prenotazioni", "coperto", "allergeni"),
    default_unit_terms=(("porzione", "portion"), ("bicchiere", "glass"), ("bottiglia", "bottle"), ("pezzo", "piece")),
)
