from app.language_modules.base import LanguageProfile


PROFILE = LanguageProfile(
    code="fr",
    family="latin",
    display_name="French",
    aliases=("french", "français", "francais", "fr-fr", "fr-ca"),
    local_ocr_lang="fr",
    openrouter_layout_model_env="OPENROUTER_LAYOUT_MODEL_FR",
    gemini_structure_model_env="GEMINI_MENU_STRUCTURE_MODEL_FR",
    ocr_rules=(
        "Preserve French accents, apostrophes, ligatures, and hyphenated dish names.",
        "Treat dietary abbreviations and serving notes as modifiers, not headings.",
    ),
    layout_rules=(
        "Group dishes under nearby headings such as Entrées, Plats, Fromages, Desserts, Boissons, and Vins.",
        "A formule or menu price may apply to a course group; do not turn the price into a category.",
    ),
    price_rules=(
        "Recognize euro prices with comma or period decimals and prices printed after the dish name.",
        "Keep formule, supplement, verre, and bouteille prices attached to the relevant item or option.",
    ),
    currency_markers=("€", "EUR", "$", "CAD"),
    unit_rules=("Treat verre, bouteille, portion, pièce, carafe, cl, and g as units or options.",),
    section_noise_rules=(
        "Exclude horaires, adresse, téléphone, réservations, service notes, and allergen notices.",
    ),
    section_terms=("entrées", "plats", "poissons", "viandes", "fromages", "desserts", "boissons", "vins"),
    cuisine_hints=("Use dish evidence such as quiche, confit, terrine, tartare, gratin, crêpe, and bouillabaisse."),
    detection_stopwords=(
        "avec", "et", "aux", "entrée", "entrées", "plat", "plats", "fromage", "dessert",
        "desserts", "boissons", "vins", "sauce", "maison",
    ),
    detection_regexes=(
        r"\b(?:entrées|plats|fromages|desserts|boissons|vins)\b",
        r"\b(?:œuf|bœuf|crème|chèvre|poêlé|fumé|maison)\b",
    ),
    default_noise_keywords=("horaires", "adresse", "téléphone", "réservations", "service compris", "allergènes"),
    default_unit_terms=(("verre", "glass"), ("bouteille", "bottle"), ("portion", "portion"), ("pièce", "piece")),
)
