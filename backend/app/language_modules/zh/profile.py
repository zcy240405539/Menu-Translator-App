from app.language_modules.base import LanguageProfile


PROFILE = LanguageProfile(
    code="zh",
    family="cjk",
    display_name="Chinese",
    aliases=("zh-cn", "zh-hans", "zh-hant", "cn", "chinese"),
    local_ocr_lang="ch",
    openrouter_layout_model_env="OPENROUTER_LAYOUT_MODEL_ZH",
    gemini_structure_model_env="GEMINI_MENU_STRUCTURE_MODEL_ZH",
    ocr_rules=(
        "Chinese menus may omit spaces between dish name, size, and price; split by visual position, currency markers, and quantity units.",
        "Preserve Simplified or Traditional characters exactly as printed in original_name.",
        "Number prefixes such as A1, 01, 招牌1, or 套餐A are part of the dish name when visually attached.",
    ),
    layout_rules=(
        "Chinese category headings often end with 类, 系列, 主食, 小吃, 汤, 饮品, 特色, 招牌, 套餐, 热菜, 凉菜, or 烧烤.",
        "If a row contains multiple dish/price pairs, split it into separate items instead of treating later dishes as descriptions.",
        "Vertical or dense two-column Chinese layouts should be grouped by x/y position first, then by nearby heading.",
    ),
    markdown_rules=(
        "On HTML-derived Chinese menus, consecutive short Chinese headings followed by prices are usually items under the nearest larger heading.",
        "Do not treat store notices, delivery notes, minimum order text, QR code captions, or membership ads as menu items.",
    ),
    price_rules=(
        "Recognize prices using 元, ￥, ¥, RMB, /份, /位, /例, /斤, 起, and plain numbers near dish names.",
        "Do not convert RMB to USD or add a dollar sign to Chinese prices.",
        "A price-only Chinese row such as 12元, ￥18, or 28 is never a section heading or dish name.",
    ),
    unit_rules=(
        "Treat 份, 位, 例, 个, 只, 串, 碗, 杯, 斤, 两, 盘, 锅, 袋, 盒, 瓶, 听, 扎, 大份, 小份 as units or size options.",
    ),
    section_terms=(
        "菜单", "招牌", "特色", "推荐", "主食", "小吃", "饮品", "汤", "热菜", "凉菜",
        "套餐", "烧烤", "海鲜", "肉类", "蔬菜", "甜品", "酒水", "茶", "咖啡",
    ),
    bilingual_rules=(
        "For bilingual Chinese-English rows, original_name should be the printed Chinese dish name and translated_name may use the printed English translation.",
        "If a line uses separators such as /, |, ·, or spaces between Chinese and English, preserve both sides but do not merge two different dishes.",
    ),
    section_noise_rules=(
        "Treat 营业时间, 地址, 电话, 微信, 公众号, 扫码, 外卖, 满减, 温馨提示, 另收, 服务费, and 发票 as business info or noise unless visually part of an item.",
    ),
    cuisine_hints=(
        "Use dish evidence such as 火锅, 粤菜, 川菜, 湘菜, 面, 粉, 饺子, 烧腊, 炒饭, 奶茶, or 烧烤 to infer cuisine.",
    ),
    detection_stopwords=(
        "菜单", "招牌", "特色", "推荐", "主食", "小吃", "饮品", "汤", "热菜", "凉菜", "套餐",
        "元", "份", "位", "例", "碗", "杯",
    ),
    detection_regexes=(
        r"[\u3400-\u9fff]{2,}",
        r"[￥¥]\s?\d+",
        r"\d+\s?元",
    ),
    default_noise_keywords=(
        "营业时间", "地址", "电话", "微信", "公众号", "扫码", "外卖", "满减", "温馨提示",
        "另收", "服务费", "发票", "会员",
    ),
    default_unit_terms=(
        ("份", "serving"),
        ("位", "person"),
        ("例", "portion"),
        ("碗", "bowl"),
        ("杯", "cup"),
        ("串", "skewer"),
        ("斤", "jin"),
    ),
)
