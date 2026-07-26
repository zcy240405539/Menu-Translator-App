from app.language_modules.base import LanguageProfile


PROFILE = LanguageProfile(
    code="ja",
    family="cjk",
    display_name="Japanese",
    aliases=("japanese", "日本語", "ja-jp"),
    local_ocr_lang="japan",
    openrouter_layout_model_env="OPENROUTER_LAYOUT_MODEL_JA",
    gemini_structure_model_env="GEMINI_MENU_STRUCTURE_MODEL_JA",
    ocr_rules=(
        "Preserve kanji, hiragana, katakana, full-width punctuation, and vertical reading order.",
        "Treat circled symbols and short labels such as 税込, 税別, 辛, and おすすめ as item metadata.",
    ),
    layout_rules=(
        "Japanese menus may read top-to-bottom and right-to-left; use OCR geometry before line order.",
        "Group items under headings such as 前菜, 刺身, 焼物, 揚物, 麺, ご飯, 甘味, and 飲み物.",
    ),
    price_rules=(
        "Recognize 円, ¥, ￥, 税込, and 税別 prices, including full-width digits.",
        "Do not treat standalone numeric prices or item numbers as section names.",
    ),
    currency_markers=("¥", "￥", "円"),
    unit_rules=("Treat 人前, 個, 本, 杯, 皿, 合, and 枚 as units or serving options.",),
    section_noise_rules=("Exclude 営業時間, 住所, 電話, 予約, 税 notes, and allergy notices."),
    section_terms=("前菜", "刺身", "寿司", "焼物", "揚物", "煮物", "麺", "ご飯", "甘味", "飲み物"),
    cuisine_hints=("Use dish evidence such as 寿司, 刺身, 天ぷら, 焼き鳥, うどん, そば, and ラーメン."),
    detection_stopwords=("おすすめ", "前菜", "刺身", "寿司", "焼物", "揚物", "麺", "ご飯", "甘味", "飲み物"),
    detection_regexes=(r"(?:税込|税別|円|おすすめ)", r"(?:刺身|寿司|天ぷら|焼き鳥|うどん|そば|ラーメン)"),
    default_noise_keywords=("営業時間", "住所", "電話", "予約", "税込", "アレルギー"),
    default_unit_terms=(("人前", "serving"), ("個", "piece"), ("本", "bottle"), ("杯", "cup"), ("皿", "plate")),
)
