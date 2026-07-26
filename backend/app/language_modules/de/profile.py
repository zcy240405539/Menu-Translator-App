from app.language_modules.base import LanguageProfile


PROFILE = LanguageProfile(
    code="de",
    family="latin",
    display_name="German",
    aliases=("german", "deutsch", "de-de", "de-at", "de-ch"),
    local_ocr_lang="german",
    openrouter_layout_model_env="OPENROUTER_LAYOUT_MODEL_DE",
    gemini_structure_model_env="GEMINI_MENU_STRUCTURE_MODEL_DE",
    ocr_rules=(
        "Preserve German umlauts, ß, compound dish names, and mixed regional dialect labels.",
        "Treat allergen codes and Zusatzstoffe as metadata, not category names.",
    ),
    layout_rules=(
        "Group items under Vorspeisen, Suppen, Salate, Hauptgerichte, Beilagen, Desserts, and Getränke.",
        "Keep portion sizes and Pfand or supplement notes attached to their item.",
    ),
    price_rules=(
        "Recognize euro prices with comma decimals and trailing dashes such as 12,-.",
        "Do not confuse numbered allergen markers or gram weights with prices.",
    ),
    currency_markers=("€", "EUR", "CHF"),
    unit_rules=("Treat Portion, Glas, Flasche, Stück, Becher, and Schale as units or options.",),
    section_noise_rules=("Exclude Öffnungszeiten, Adresse, Telefon, Reservierung, service fees, and allergen notices."),
    section_terms=("vorspeisen", "suppen", "salate", "hauptgerichte", "beilagen", "desserts", "getränke"),
    cuisine_hints=("Use dish evidence such as schnitzel, bratwurst, spätzle, sauerbraten, knödel, and strudel."),
    detection_stopwords=("mit", "und", "vom", "vorspeisen", "suppen", "salate", "hauptgerichte", "beilagen", "desserts", "getränke"),
    detection_regexes=(
        r"\b(?:vorspeisen|suppen|salate|hauptgerichte|beilagen|desserts|getränke)\b",
        r"\b(?:schnitzel|bratwurst|spätzle|knödel|käse|gemüse)\b",
    ),
    default_noise_keywords=("öffnungszeiten", "adresse", "telefon", "reservierung", "servicegebühr", "allergene"),
    default_unit_terms=(("portion", "portion"), ("glas", "glass"), ("flasche", "bottle"), ("stück", "piece")),
)
