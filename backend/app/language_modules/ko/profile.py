from app.language_modules.base import LanguageProfile


PROFILE = LanguageProfile(
    code="ko",
    family="hangul",
    display_name="Korean",
    aliases=("korean", "한국어", "ko-kr"),
    local_ocr_lang="korean",
    openrouter_layout_model_env="OPENROUTER_LAYOUT_MODEL_KO",
    gemini_structure_model_env="GEMINI_MENU_STRUCTURE_MODEL_KO",
    ocr_rules=(
        "Preserve Hangul syllable blocks, spacing, won symbols, and mixed Latin brand names.",
        "Treat 매운맛, 추천, 인기, and 원산지 as item metadata unless visually used as headings.",
    ),
    layout_rules=(
        "Group items under headings such as 전채, 구이, 찌개, 전골, 면류, 밥류, 후식, and 음료.",
        "Keep set-menu composition and per-person minimums with the parent menu item.",
    ),
    price_rules=(
        "Recognize ₩, 원, comma-grouped won amounts, and prices abbreviated with 천.",
        "Do not split a dish name from a right-aligned won price.",
    ),
    currency_markers=("₩", "원"),
    unit_rules=("Treat 인분, 개, 잔, 병, 접시, and 그릇 as units or serving options.",),
    section_noise_rules=("Exclude 영업시간, 주소, 전화, 예약, 부가세, 원산지 notices, and allergy notices."),
    section_terms=("전채", "구이", "볶음", "찌개", "전골", "면류", "밥류", "후식", "음료"),
    cuisine_hints=("Use dish evidence such as 불고기, 비빔밥, 김치찌개, 냉면, 갈비, 떡볶이, and 삼겹살."),
    detection_stopwords=("추천", "메뉴", "전채", "구이", "찌개", "전골", "면류", "밥류", "후식", "음료"),
    detection_regexes=(r"(?:원|₩)\s?\d|\d[\d,]*\s?원", r"(?:불고기|비빔밥|김치|냉면|갈비|떡볶이)"),
    default_noise_keywords=("영업시간", "주소", "전화", "예약", "부가세", "알레르기"),
    default_unit_terms=(("인분", "serving"), ("개", "piece"), ("잔", "glass"), ("병", "bottle"), ("접시", "plate")),
)
