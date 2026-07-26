from app.language_modules.base import LanguageProfile


PROFILE = LanguageProfile(
    code="ar",
    family="arabic",
    display_name="Arabic",
    aliases=("arabic", "العربية", "ar-sa", "ar-ae", "ar-eg"),
    local_ocr_lang="arabic",
    openrouter_layout_model_env="OPENROUTER_LAYOUT_MODEL_AR",
    gemini_structure_model_env="GEMINI_MENU_STRUCTURE_MODEL_AR",
    ocr_rules=(
        "Preserve right-to-left Arabic reading order, connected letter forms, diacritics, and Arabic-Indic digits.",
        "Keep mixed Arabic and Latin brand names in their printed order.",
    ),
    layout_rules=(
        "Use OCR geometry for right-to-left columns and attach prices on the visual left or right to the nearest dish row.",
        "Group items under headings such as المقبلات, الشوربات, السلطات, الأطباق الرئيسية, الحلويات, and المشروبات.",
    ),
    price_rules=(
        "Recognize Arabic-Indic and Western digits with local currency abbreviations and decimal separators.",
        "Do not treat standalone prices, item numbers, or serving counts as headings.",
    ),
    currency_markers=("$", "ر.س", "د.إ", "د.ك", "ج.م", "د.أ", "ر.ق"),
    unit_rules=("Treat حصة, قطعة, كوب, زجاجة, طبق, غ, كغ, and مل as units or options.",),
    section_noise_rules=("Exclude ساعات العمل, العنوان, الهاتف, الحجز, service fees, and allergen notices."),
    section_terms=("المقبلات", "الشوربات", "السلطات", "الأطباق الرئيسية", "الحلويات", "المشروبات"),
    cuisine_hints=("Use dish evidence such as حمص, تبولة, كباب, شاورما, منسف, فلافل, and كنافة."),
    detection_stopwords=("مع", "و", "المقبلات", "الشوربات", "السلطات", "الأطباق", "الحلويات", "المشروبات"),
    detection_regexes=(r"(?:المقبلات|الشوربات|السلطات|الأطباق الرئيسية|الحلويات|المشروبات)", r"(?:حمص|تبولة|كباب|شاورما|فلافل|كنافة)"),
    default_noise_keywords=("ساعات العمل", "العنوان", "الهاتف", "الحجز", "رسوم الخدمة", "مسببات الحساسية"),
    default_unit_terms=(("حصة", "portion"), ("قطعة", "piece"), ("كوب", "cup"), ("زجاجة", "bottle"), ("طبق", "plate")),
)
