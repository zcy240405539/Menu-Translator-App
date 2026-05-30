SUPPORTED_LANGUAGES = {
    "en": {"name": "English", "native": "English"},
    "zh": {"name": "Simplified Chinese", "native": "简体中文"},
    "zh-Hant": {"name": "Traditional Chinese", "native": "繁體中文"},
    # "ja": {"name": "Japanese", "native": "日本語"},
    # "ko": {"name": "Korean", "native": "한국어"},
    # "fr": {"name": "French", "native": "Français"},
    # "es": {"name": "Spanish", "native": "Español"},
    # "de": {"name": "German", "native": "Deutsch"},
    # "it": {"name": "Italian", "native": "Italiano"},
    # "pt": {"name": "Portuguese", "native": "Português"},
}

DEFAULT_SOURCE_LANGUAGE = "en"
DEFAULT_TARGET_LANGUAGE = "zh"


def normalize_lang(lang: str | None, fallback: str = "en") -> str:
    if not lang:
        return fallback
    lang = lang.lower().strip()
    if lang in ("cn", "zh-cn", "zh_hans", "chinese"):
        return "zh"
    if lang in ("zh-tw", "zh_hant", "zh-hant", "zh-hk", "traditional chinese", "traditional-chinese"):
        return "zh-Hant"
    if lang in ("english",):
        return "en"
    return lang if lang in SUPPORTED_LANGUAGES else fallback


def get_language_name(lang: str | None) -> str:
    lang = normalize_lang(lang)
    return SUPPORTED_LANGUAGES.get(lang, {}).get("name", lang)


def get_language_options():
    return [
        {"code": code, **info}
        for code, info in SUPPORTED_LANGUAGES.items()
    ]
