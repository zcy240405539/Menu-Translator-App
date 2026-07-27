from __future__ import annotations

import argparse
import json
import re
import sys
from copy import deepcopy
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.services.google_translation_service import translate_texts  # noqa: E402


LANGUAGES = ("en", "zh", "zh-Hant", "es", "fr", "ja", "ko", "ru", "pt", "de", "it", "ar")
WEB_CODES = {"zh": "zh-cn"}
LANGUAGE_NAMES = {
    "auto": "Auto Detect",
    "en": "English",
    "zh": "Chinese-Simplified",
    "zh-Hant": "Chinese-Traditional",
    "es": "Spanish",
    "fr": "French",
    "ja": "Japanese",
    "ko": "Korean",
    "ru": "Russian",
    "pt": "Portuguese",
    "de": "German",
    "it": "Italian",
    "ar": "Arabic",
}
PROTECTED_EXACT = {
    "AI Menu APP",
    "AI Menu APP 2.3",
    "Facebook",
    "Google",
    "Google AdMob",
    "Google AdSense",
    "Instagram",
    "Meta",
    "OpenAI",
    "OpenRouter",
    "Pexels",
    "Rednote",
    "Render",
    "Supabase",
    "Unsplash",
    "WeChat",
    "Weibo",
    "WhatsApp",
    "Wikimedia Commons",
    "X / Twitter",
}


APP_EN_PATCH = {
    "appTitle": "AI Menu APP",
    "languageNames": LANGUAGE_NAMES,
    "common": {
        "brand": "AI Menu APP",
        "contact": "Contact",
        "dishFallback": "Dish",
        "restaurantFallback": "Restaurant",
        "items": "items",
    },
    "dietOptions": {
        "Vegetarian": "Vegetarian",
        "Halal": "Halal",
        "Kosher": "Kosher",
        "Keto": "Keto",
        "Gluten-Free": "Gluten-Free",
    },
    "home": {
        "shareTargets": {
            "wechat": "WeChat",
            "rednote": "Rednote",
            "weibo": "Weibo",
            "facebook": "Facebook",
            "x": "X / Twitter",
            "whatsapp": "WhatsApp",
            "email": "Email",
        },
    },
    "cart": {
        "title": "Order List",
        "heading": "My Order List",
        "shareMessage": "Check out my order list in AI Menu APP.",
        "items": "items",
        "total": "Total",
        "remove": "Remove",
        "empty": "No dishes added yet",
    },
    "history": {
        "title": "Menu History",
        "shareMessage": "Check out my menu history in AI Menu APP.",
        "items": "items",
        "open": "Tap to open",
        "empty": "No menu history yet",
    },
    "result": {"other": "Other"},
    "recommend": {
        "intro": "Tell AI your preferences and get a customized recommendation.",
        "allergiesPlaceholder": "e.g., peanut, seafood (comma separated)",
        "addedMessage": "Added to order list",
    },
    "detail": {
        "allergyRiskTitle": "Allergy Risk Warning",
        "allergyRiskMessage": "This dish may contain or come into contact with: {allergens}. Confirm directly with the restaurant before ordering.",
        "preparingImage": "Preparing image",
        "loadingDetails": "Loading details...",
        "changeImage": "Not matching? Change",
        "addToCart": "Add to Order List",
        "addedToCart": "Added to order list",
    },
    "auth": {
        "resetFailed": "Failed to send reset email",
        "authenticationFailed": "Authentication failed",
        "redirectUnsupported": "Cannot open the sign-in page on this device",
        "facebookLogin": "Continue with Facebook",
        "facebookLoginFailed": "Failed to start Facebook sign-in",
        "googleLoginFailed": "Failed to start Google sign-in",
    },
    "profile": {
        "updateFailed": "Failed to update profile",
    },
    "legal": {
        "deletion": {
            "title": "Delete your AI Menu APP account",
            "subtitle": "Request deletion of your account and associated account data.",
            "requestEmail": "Email account deletion request",
            "emailSubject": "AI Menu APP Account Deletion Request",
            "emailBody": "Please delete my AI Menu APP account.\n\nRegistered email:\nUsername if known:\n",
            "sections": [
                {
                    "heading": "How to request deletion",
                    "items": [
                        "Send the request from the email address registered with your account.",
                        "Include your registered email and username if available.",
                        "We will verify the request and process account deletion.",
                    ],
                },
                {
                    "heading": "Data deleted",
                    "items": [
                        "Account profile data, authentication account, avatar, saved menu history, profile preferences, and saved order list data associated with the account will be deleted where technically feasible.",
                    ],
                },
                {
                    "heading": "Data that may be retained",
                    "items": [
                        "We may retain security logs, transaction records required by law, and anonymized or non-user-linked menu, dish, and image cache data that is no longer associated with your account.",
                    ],
                },
            ],
        },
    },
}

WEB_EN_PATCH = {
    "common": {"brand": "AI Menu APP"},
    "auth": {
        "facebook": "Continue with Facebook",
        "facebookFailed": "Unable to open Facebook sign in.",
    },
    "metaDescription": "Translate multilingual menus from photos, PDFs, text, and links.",
    "languageNames": {key if key != "zh" else "zh-cn": value for key, value in LANGUAGE_NAMES.items() if key != "auto"},
    "languageShortNames": {"zh-cn": "Chinese", "zh-Hant": "Chinese"},
    "saved": {"menuFallback": "Menu", "dishFallback": "Dish"},
    "metadata": {
        "home": {
            "title": "AI Menu APP - Translate Menus & Order with Ease",
            "description": "Translate multilingual menus from photos, PDFs, text, and links.",
        },
        "login": {"title": "Sign in - AI Menu APP", "description": "Sign in to AI Menu APP."},
        "history": {"title": "History - AI Menu APP", "description": "Saved menu history for AI Menu APP."},
        "cart": {"title": "Cart - AI Menu APP", "description": "Saved order list for AI Menu APP."},
        "settings": {
            "title": "Settings | AI Menu APP",
            "description": "Manage AI Menu APP website settings and legal information.",
        },
        "privacy": {"title": "Privacy Policy - AI Menu APP", "description": "Privacy Policy for AI Menu APP."},
        "terms": {
            "title": "Terms of Service | AI Menu APP",
            "description": "Terms governing the use of AI Menu APP.",
        },
        "deletion": {
            "title": "Account Deletion - AI Menu APP",
            "description": "Request deletion of your AI Menu APP account.",
        },
    },
}

BACKEND_EN = {
    "common": {"brand": "AI Menu APP", "contact": "Contact"},
    "errors": {
        "missingAuthorization": "Missing Authorization header",
        "invalidAuthorization": "Invalid Authorization header format",
        "invalidSession": "Invalid session token",
        "serviceNotConfigured": "The account service is not configured",
        "imageRequired": "The file must be an image",
        "avatarUploadFailed": "Failed to upload avatar: {error}",
        "menuCacheNotFound": "Menu cache not found",
        "noReadableText": "No readable menu text was extracted.",
        "menuFileRequired": "No menu file was uploaded",
        "taskNotFound": "Task not found",
    },
    "legal": {
        "deletion": {
            "emailSubject": "AI Menu APP Account Deletion Request",
            "emailBody": "Please delete my AI Menu APP account.\n\nRegistered email:\nUsername if known:\n",
        }
    },
}


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def deep_merge(base: Any, override: Any) -> Any:
    if isinstance(base, dict) and isinstance(override, dict):
        merged = deepcopy(base)
        for key, value in override.items():
            merged[key] = deep_merge(merged.get(key), value) if key in merged else deepcopy(value)
        return merged
    if isinstance(base, list) and isinstance(override, list):
        return [
            deep_merge(base[index], override[index]) if index < len(override) else deepcopy(base[index])
            for index in range(max(len(base), len(override)))
            if index < len(base)
        ]
    return deepcopy(override)


def collect_strings(value: Any, result: set[str]) -> None:
    if isinstance(value, str):
        if value.strip() and value not in PROTECTED_EXACT and not re.match(r"^(https?://|mailto:|[^@\s]+@[^@\s]+$)", value):
            result.add(value)
    elif isinstance(value, dict):
        for child in value.values():
            collect_strings(child, result)
    elif isinstance(value, list):
        for child in value:
            collect_strings(child, result)


def translate_value(value: Any, translations: dict[str, str]) -> Any:
    if isinstance(value, str):
        if value in PROTECTED_EXACT or re.match(r"^(https?://|mailto:|[^@\s]+@[^@\s]+$)", value):
            return value
        return translations.get(value, value)
    if isinstance(value, dict):
        return {key: translate_value(child, translations) for key, child in value.items()}
    if isinstance(value, list):
        return [translate_value(child, translations) for child in value]
    return value


def restore_placeholders(source: Any, translated: Any, fallback: Any = None) -> Any:
    if isinstance(source, str) and isinstance(translated, str):
        source_tokens = re.findall(r"\{[^{}]+\}", source)
        translated_tokens = re.findall(r"\{[^{}]+\}", translated)
        if len(source_tokens) != len(translated_tokens) and isinstance(fallback, str):
            translated = fallback
            translated_tokens = re.findall(r"\{[^{}]+\}", translated)
        for actual, expected in zip(translated_tokens, source_tokens):
            translated = translated.replace(actual, expected, 1)
        return translated
    if isinstance(source, dict) and isinstance(translated, dict):
        return {
            key: restore_placeholders(
                value,
                translated[key],
                fallback.get(key) if isinstance(fallback, dict) else None,
            )
            for key, value in source.items()
        }
    if isinstance(source, list) and isinstance(translated, list):
        return [
            restore_placeholders(
                source[index],
                translated[index],
                fallback[index] if isinstance(fallback, list) and index < len(fallback) else None,
            )
            for index in range(len(source))
        ]
    return translated


def translate_source_strings(source_strings: set[str], language: str, offline: bool) -> dict[str, str]:
    if offline:
        return {value: value for value in source_strings}

    protected = {}
    markers = {}
    for value in source_strings:
        protected_value = value
        value_markers = {}
        for index, token in enumerate(re.findall(r"\{[^{}]+\}", value)):
            marker = f"ZXQPH{index}ZXQ"
            protected_value = protected_value.replace(token, marker, 1)
            value_markers[marker] = token
        protected[value] = protected_value
        markers[value] = value_markers

    translated = translate_texts(
        sorted(set(protected.values())),
        target_lang=language,
        source_lang="en",
    )
    result = {}
    for original, protected_value in protected.items():
        output = translated.get(protected_value, original)
        for marker, token in markers[original].items():
            output = output.replace(marker, token)
        result[original] = output
    return result


def existing_catalog(directory: Path, language: str, web: bool = False) -> dict[str, Any]:
    code = WEB_CODES.get(language, language) if web else language
    return read_json(directory / f"{code}.json")


def main() -> None:
    parser = argparse.ArgumentParser(description="Fill complete APP, Web, and backend locale catalogs.")
    parser.add_argument("--offline", action="store_true", help="Copy English for missing translations without calling Google.")
    args = parser.parse_args()

    app_dir = ROOT / "frontend" / "locales"
    web_dir = ROOT / "frontend-web" / "src" / "locales"
    backend_dir = ROOT / "backend" / "app" / "i18n" / "locales"

    app_en = deep_merge(read_json(app_dir / "en.json"), APP_EN_PATCH)
    web_en = deep_merge(read_json(web_dir / "en.json"), WEB_EN_PATCH)
    backend_en = deep_merge(BACKEND_EN, {
        "legal": {
            "deletion": web_en["legal"]["deletion"],
            "privacy": web_en["legalDocuments"]["privacy"],
            "terms": web_en["legalDocuments"]["terms"],
        }
    })

    write_json(app_dir / "en.json", app_en)
    write_json(web_dir / "en.json", web_en)
    write_json(backend_dir / "en.json", backend_en)

    source_catalogs = (app_en, web_en, backend_en)
    source_strings: set[str] = set()
    for catalog in source_catalogs:
        collect_strings(catalog, source_strings)

    for language in LANGUAGES[1:]:
        translations = translate_source_strings(source_strings, language, args.offline)

        app_generated = translate_value(app_en, translations)
        web_generated = translate_value(web_en, translations)
        backend_generated = translate_value(backend_en, translations)

        app_catalog = restore_placeholders(
            app_en,
            deep_merge(app_generated, existing_catalog(app_dir, language)),
            app_generated,
        )
        web_catalog = restore_placeholders(
            web_en,
            deep_merge(web_generated, existing_catalog(web_dir, language, web=True)),
            web_generated,
        )
        backend_catalog = restore_placeholders(
            backend_en,
            deep_merge(backend_generated, existing_catalog(backend_dir, language)),
            backend_generated,
        )

        write_json(app_dir / f"{language}.json", app_catalog)
        write_json(web_dir / f"{WEB_CODES.get(language, language)}.json", web_catalog)
        write_json(backend_dir / f"{language}.json", backend_catalog)
        print(f"Generated {language}")


if __name__ == "__main__":
    main()
