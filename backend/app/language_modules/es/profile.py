from app.language_modules.base import LanguageProfile


PROFILE = LanguageProfile(
    code="es",
    family="latin",
    display_name="Spanish",
    aliases=("spanish", "español", "espanol", "es-mx", "es-es"),
    local_ocr_lang="en",
    openrouter_layout_model_env="OPENROUTER_LAYOUT_MODEL_ES",
    gemini_structure_model_env="GEMINI_MENU_STRUCTURE_MODEL_ES",
    ocr_rules=(
        "Preserve Spanish accents and ñ in original_name and section headings.",
        "Uppercase words such as TAPAS, RACIONES, BOCADILLOS, POSTRES, BEBIDAS, or CARNES are likely headings when visually separated.",
        "Short item numbers and tapa numbers are identifiers only when attached to item text; a standalone number is usually a price.",
    ),
    layout_rules=(
        "Spanish menus often show a shared section price next to headings; keep the textual heading and apply the price only as item default when appropriate.",
        "For tapas-style menus, a price column may appear visually above groups; never make that price the category.",
        "Group items under headings such as Tapas, Raciones, Bocadillos, Montaditos, Ensaladas, Carnes, Pescados, Postres, Bebidas, and Vinos when visible.",
    ),
    markdown_rules=(
        "On HTML-derived Spanish menus, dish subheadings with descriptions and prices should remain under the nearest parent section.",
        "Exclude reservation, delivery, schedule, footer, legal, and social-media text from menu_items.",
    ),
    price_rules=(
        "Recognize prices with €, EUR, comma decimals, and plain group prices such as 9, 13, or 14 when visually price-like.",
        "A standalone number is not a section heading unless accompanied by a real textual heading.",
        "Do not confuse numbered dish names with prices when the number is directly attached to a dish code.",
    ),
    unit_rules=(
        "Treat copa, vaso, botella, caña, pinta, ración, media ración, unidad, ud, kg, g, and ml as units or serving options.",
    ),
    bilingual_rules=(
        "If Spanish and English names are printed together, original_name should be the Spanish item name and translated_name may use the printed English name.",
    ),
    section_noise_rules=(
        "Treat IVA, propina, servicio, alérgenos, horario, dirección, teléfono, reservas, síguenos, and redes sociales as business info or noise unless printed as an item.",
    ),
    cuisine_hints=(
        "Use dish evidence such as tapas, paella, tortilla, croquetas, bocadillo, jamón, patatas bravas, pulpo, ceviche, taco, or empanada to infer cuisine.",
    ),
    detection_stopwords=(
        "con", "de", "del", "la", "el", "los", "las", "tapas", "raciones", "bocadillos",
        "ensaladas", "postres", "bebidas", "vino", "cerveza", "jamón", "patatas",
        "menú", "menu", "entrada", "entradas", "plato", "refresco", "natural",
    ),
    detection_regexes=(
        r"\b(?:tapas|raciones|bocadillos|montaditos|ensaladas|postres|bebidas|carnes|pescados)\b",
        r"\d+,\d{2}\s?€",
        r"\b(?:jamón|patatas|tortilla|croquetas|alioli|pimentón|boquerones)\b",
    ),
    default_noise_keywords=(
        "iva", "propina", "servicio", "alérgenos", "alergenos", "horario", "dirección",
        "direccion", "teléfono", "telefono", "reservas", "síguenos", "siguenos",
    ),
    default_unit_terms=(
        ("copa", "glass"),
        ("vaso", "glass"),
        ("botella", "bottle"),
        ("caña", "small draft beer"),
        ("ración", "portion"),
        ("media ración", "half portion"),
    ),
)
