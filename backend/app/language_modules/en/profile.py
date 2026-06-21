from app.language_modules.base import LanguageProfile


PROFILE = LanguageProfile(
    code="en",
    family="latin",
    display_name="English",
    aliases=("english", "en-us", "en-gb"),
    local_ocr_lang="en",
    openrouter_layout_model_env="OPENROUTER_LAYOUT_MODEL_EN",
    gemini_structure_model_env="GEMINI_MENU_STRUCTURE_MODEL_EN",
    ocr_rules=(
        "English menu item names are often Title Case or ALL CAPS; do not treat capitalization alone as a section signal.",
        "Short uppercase words beside item names, such as GF, V, VG, DF, or spicy marks, are dietary tags unless visually used as headings.",
        "Keep dish number prefixes, combo numbers, and size names exactly as printed.",
    ),
    layout_rules=(
        "For multi-column English menus, columns are independent reading groups; assign items to the nearest heading in the same column.",
        "A section heading may use separators such as '+', '&', '/', or '-'; merge adjacent heading fragments before assigning dishes.",
        "If a section heading has a default price, apply it to following items only when the items do not have individual prices.",
    ),
    markdown_rules=(
        "On HTML-derived menus, a parent heading followed by many dish-like subheadings is the section; the subheadings are items.",
        "Do not make business hours, order buttons, reservations, cart text, or footer links into menu sections.",
    ),
    price_rules=(
        "Recognize dollar prices with or without a dollar sign, including 9, 9.5, 9.50, $9, and $9.50.",
        "Do not use price-only lines as item names or section headings.",
        "For multiple size columns, return one item with a combined price string instead of duplicate items.",
    ),
    unit_rules=(
        "Treat oz, lb, lbs, pc, pcs, each, cup, bowl, pint, quart, bottle, glass, side, and add-on as units or options.",
    ),
    bilingual_rules=(
        "If an English menu includes another language in parentheses, keep the printed English item name as original_name unless the requested source language is that other language.",
    ),
    section_noise_rules=(
        "Treat tax, gratuity, substitutions, dietary legends, card fees, address, phone, website, and social handles as non-menu business or noise text.",
    ),
    cuisine_hints=(
        "Use dish evidence such as taco, burrito, pasta, sushi, curry, pho, burger, barbecue, tapas, or pizza to infer cuisine.",
    ),
    detection_stopwords=(
        "and", "with", "served", "choice", "add", "side", "breakfast", "lunch", "dinner",
        "appetizers", "salads", "sandwiches", "desserts", "drinks", "coffee",
    ),
    detection_regexes=(
        r"\$\s?\d",
        r"\b(?:oz|lb|lbs|cup|bowl|side|add)\b",
    ),
    default_noise_keywords=(
        "tax", "gratuity", "substitutions", "extra charge", "follow us", "instagram",
        "facebook", "allergy", "allergen", "reservation", "order online",
    ),
    default_unit_terms=(
        ("oz", "ounce"),
        ("lb", "pound"),
        ("lbs", "pounds"),
        ("pc", "piece"),
        ("pcs", "pieces"),
    ),
)
