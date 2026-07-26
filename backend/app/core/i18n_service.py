SUPPORTED_LANGUAGES = {
    "en": {"name": "English", "native": "English"},
    "zh": {"name": "Simplified Chinese", "native": "简体中文"},
    "zh-Hant": {"name": "Traditional Chinese", "native": "繁體中文"},
    "es": {"name": "Spanish", "native": "Español"},
    "fr": {"name": "French", "native": "Français"},
    "ja": {"name": "Japanese", "native": "日本語"},
    "ko": {"name": "Korean", "native": "한국어"},
    "ru": {"name": "Russian", "native": "Русский"},
    "pt": {"name": "Portuguese", "native": "Português"},
    "de": {"name": "German", "native": "Deutsch"},
    "it": {"name": "Italian", "native": "Italiano"},
    "ar": {"name": "Arabic", "native": "العربية"},
}

DEFAULT_SOURCE_LANGUAGE = "en"
DEFAULT_TARGET_LANGUAGE = "zh"


def normalize_lang(lang: str | None, fallback: str = "en") -> str:
    if not lang:
        return fallback
    normalized = str(lang).strip().replace("_", "-").lower()
    aliases = {
        "auto": "auto",
        "cn": "zh",
        "zh": "zh",
        "zh-cn": "zh",
        "zh-hans": "zh",
        "chinese": "zh",
        "simplified chinese": "zh",
        "zh-tw": "zh-Hant",
        "zh-hant": "zh-Hant",
        "zh-hk": "zh-Hant",
        "traditional chinese": "zh-Hant",
        "traditional-chinese": "zh-Hant",
        "english": "en",
        "spanish": "es",
        "español": "es",
        "espanol": "es",
        "french": "fr",
        "français": "fr",
        "francais": "fr",
        "japanese": "ja",
        "日本語": "ja",
        "korean": "ko",
        "한국어": "ko",
        "russian": "ru",
        "русский": "ru",
        "portuguese": "pt",
        "português": "pt",
        "portugues": "pt",
        "german": "de",
        "deutsch": "de",
        "italian": "it",
        "italiano": "it",
        "arabic": "ar",
        "العربية": "ar",
    }
    direct = aliases.get(normalized)
    if direct:
        return direct if direct == "auto" or direct in SUPPORTED_LANGUAGES else fallback

    primary = normalized.split("-", 1)[0]
    return primary if primary in SUPPORTED_LANGUAGES else fallback


def get_language_name(lang: str | None) -> str:
    lang = normalize_lang(lang)
    return SUPPORTED_LANGUAGES.get(lang, {}).get("name", lang)


def get_language_options():
    return [
        {"code": code, **info}
        for code, info in SUPPORTED_LANGUAGES.items()
    ]
