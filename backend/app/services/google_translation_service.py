import os
import json
import re
import time
from typing import Iterable

import requests

from app.core.config import (
    GOOGLE_APPLICATION_CREDENTIALS,
    GOOGLE_APPLICATION_CREDENTIALS_JSON,
    GOOGLE_CLOUD_ACCESS_TOKEN,
    GOOGLE_CLOUD_API,
    GOOGLE_CLOUD_LOCATION,
    GOOGLE_CLOUD_PROJECT_ID,
    GOOGLE_CLOUD_TRANSLATION_GLOSSARY_ID,
    GOOGLE_CLOUD_TRANSLATION_MODEL,
)
from app.core.i18n_service import normalize_lang


GOOGLE_TRANSLATION_TIMEOUT = int(os.getenv("GOOGLE_CLOUD_TRANSLATION_TIMEOUT", "12"))
GOOGLE_TRANSLATION_BATCH_SIZE = max(1, int(os.getenv("GOOGLE_CLOUD_TRANSLATION_BATCH_SIZE", "80")))
GOOGLE_TRANSLATION_MIME_TYPE = os.getenv("GOOGLE_CLOUD_TRANSLATION_MIME_TYPE", "text/plain")
GOOGLE_TRANSLATION_SCOPES = ["https://www.googleapis.com/auth/cloud-translation"]
_ACCESS_TOKEN_CACHE = {"token": None, "expires_at": 0}


def is_google_translation_configured() -> bool:
    return bool(GOOGLE_CLOUD_PROJECT_ID and _has_v3_credentials())


def _has_google_api_key() -> bool:
    return bool(GOOGLE_CLOUD_API)


def _has_v3_credentials() -> bool:
    return bool(
        GOOGLE_CLOUD_ACCESS_TOKEN
        or GOOGLE_APPLICATION_CREDENTIALS_JSON
        or GOOGLE_APPLICATION_CREDENTIALS
    )


def google_translation_provider_name() -> str:
    if is_google_translation_configured():
        return "google_cloud_translation_v3"
    if _has_google_api_key():
        return "google_cloud_translation_v2_key_fallback"
    return "google_cloud_translation_not_configured"


def _google_language_code(lang: str | None, *, source: bool = False) -> str | None:
    normalized = normalize_lang(lang, "auto" if source else "zh")
    if source and normalized == "auto":
        return None

    return {
        "zh": "zh-CN",
        "zh-Hant": "zh-TW",
        "en": "en",
        "es": "es",
    }.get(normalized, normalized)


def _translation_parent() -> str:
    location = GOOGLE_CLOUD_LOCATION or "global"
    return f"projects/{GOOGLE_CLOUD_PROJECT_ID}/locations/{location}"


def _translation_model_path() -> str | None:
    model = (GOOGLE_CLOUD_TRANSLATION_MODEL or "").strip()
    if not model:
        return None
    if model.startswith("projects/"):
        return model
    return f"{_translation_parent()}/models/{model}"


def _glossary_path() -> str | None:
    glossary_id = (GOOGLE_CLOUD_TRANSLATION_GLOSSARY_ID or "").strip()
    if not glossary_id:
        return None
    if glossary_id.startswith("projects/"):
        return glossary_id
    return f"{_translation_parent()}/glossaries/{glossary_id}"


def _chunks(values: list[str], size: int) -> Iterable[list[str]]:
    for index in range(0, len(values), size):
        yield values[index:index + size]


def _clean_text(value) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def get_google_access_token() -> str:
    if GOOGLE_CLOUD_ACCESS_TOKEN:
        return GOOGLE_CLOUD_ACCESS_TOKEN

    cached_token = _ACCESS_TOKEN_CACHE.get("token")
    if cached_token and float(_ACCESS_TOKEN_CACHE.get("expires_at") or 0) > time.time() + 60:
        return str(cached_token)

    try:
        from google.auth.transport.requests import Request
        from google.oauth2 import service_account
    except Exception as exc:
        raise RuntimeError(
            "google-auth is required for Cloud Translation Advanced v3 service account auth."
        ) from exc

    if GOOGLE_APPLICATION_CREDENTIALS_JSON:
        info = json.loads(GOOGLE_APPLICATION_CREDENTIALS_JSON)
        credentials = service_account.Credentials.from_service_account_info(
            info,
            scopes=GOOGLE_TRANSLATION_SCOPES,
        )
    elif GOOGLE_APPLICATION_CREDENTIALS:
        credentials = service_account.Credentials.from_service_account_file(
            GOOGLE_APPLICATION_CREDENTIALS,
            scopes=GOOGLE_TRANSLATION_SCOPES,
        )
    else:
        raise RuntimeError("No Cloud Translation Advanced v3 credentials configured.")

    credentials.refresh(Request())
    _ACCESS_TOKEN_CACHE["token"] = credentials.token
    expiry = getattr(credentials, "expiry", None)
    _ACCESS_TOKEN_CACHE["expires_at"] = expiry.timestamp() if expiry else time.time() + 3000
    return credentials.token


def _translate_texts_v3(
    texts: list[str],
    target_code: str,
    source_code: str | None,
) -> dict[str, str]:
    endpoint = f"https://translation.googleapis.com/v3/{_translation_parent()}:translateText"
    model = _translation_model_path()
    glossary = _glossary_path()
    translations: dict[str, str] = {}
    headers = {
        "Authorization": f"Bearer {get_google_access_token()}",
        "Content-Type": "application/json",
    }

    for batch in _chunks(texts, GOOGLE_TRANSLATION_BATCH_SIZE):
        payload = {
            "contents": batch,
            "mimeType": GOOGLE_TRANSLATION_MIME_TYPE,
            "targetLanguageCode": target_code,
        }
        if source_code:
            payload["sourceLanguageCode"] = source_code
        if model:
            payload["model"] = model
        if glossary:
            payload["glossaryConfig"] = {"glossary": glossary}

        response = requests.post(
            endpoint,
            headers=headers,
            json=payload,
            timeout=GOOGLE_TRANSLATION_TIMEOUT,
        )
        response.raise_for_status()
        data = response.json()
        translated_entries = data.get("glossaryTranslations") or data.get("translations") or []
        for source, entry in zip(batch, translated_entries):
            translations[source] = _clean_text(entry.get("translatedText") or source)

    return translations


def _translate_texts_v2(
    texts: list[str],
    target_code: str,
    source_code: str | None,
) -> dict[str, str]:
    endpoint = "https://translation.googleapis.com/language/translate/v2"
    translations: dict[str, str] = {}

    for batch in _chunks(texts, GOOGLE_TRANSLATION_BATCH_SIZE):
        payload = {
            "q": batch,
            "target": target_code,
            "format": "text",
        }
        if source_code:
            payload["source"] = source_code

        response = requests.post(
            endpoint,
            params={"key": GOOGLE_CLOUD_API},
            data=payload,
            timeout=GOOGLE_TRANSLATION_TIMEOUT,
        )
        response.raise_for_status()
        entries = response.json().get("data", {}).get("translations") or []
        for source, entry in zip(batch, entries):
            translations[source] = _clean_text(entry.get("translatedText") or source)

    return translations


def _load_database_glossary(texts: list[str], target_lang: str, source_lang: str) -> dict[str, str]:
    try:
        from app.core.database import SessionLocal
        from app.core.models import TranslationGlossaryTerm
    except Exception:
        return {}

    if not texts:
        return {}

    db = SessionLocal()
    try:
        query = db.query(TranslationGlossaryTerm).filter(
            TranslationGlossaryTerm.is_active == True,  # noqa: E712
            TranslationGlossaryTerm.target_language == target_lang,
            TranslationGlossaryTerm.source_text.in_(texts),
        )
        if source_lang and source_lang != "auto":
            query = query.filter(
                (
                    TranslationGlossaryTerm.source_language == source_lang
                ) | (
                    TranslationGlossaryTerm.source_language == None  # noqa: E711
                )
            )

        return {
            _clean_text(term.source_text): _clean_text(term.translated_text)
            for term in query.all()
            if _clean_text(term.source_text) and _clean_text(term.translated_text)
        }
    except Exception as exc:
        print("Database translation glossary skipped:", exc)
        return {}
    finally:
        db.close()


def translate_texts(
    texts: list[str],
    target_lang: str = "zh",
    source_lang: str = "auto",
) -> dict[str, str]:
    cleaned = []
    seen = set()
    for text in texts or []:
        value = _clean_text(text)
        if value and value not in seen:
            cleaned.append(value)
            seen.add(value)

    if not cleaned:
        return {}

    target_lang = normalize_lang(target_lang, "zh")
    source_lang = normalize_lang(source_lang, "auto")
    glossary_overrides = _load_database_glossary(cleaned, target_lang, source_lang)
    pending = [text for text in cleaned if text not in glossary_overrides]

    target_code = _google_language_code(target_lang)
    source_code = _google_language_code(source_lang, source=True)

    if source_code and source_code == target_code:
        return {text: text for text in cleaned}

    if not is_google_translation_configured():
        if _has_google_api_key():
            v2_translations = _translate_texts_v2(
                pending,
                target_code=target_code,
                source_code=source_code,
            )
            return {
                text: glossary_overrides.get(text) or v2_translations.get(text) or text
                for text in cleaned
            }
        return {text: glossary_overrides.get(text, text) for text in cleaned}

    translations: dict[str, str] = dict(glossary_overrides)
    try:
        translations.update(
            _translate_texts_v3(
                pending,
                target_code=target_code,
                source_code=source_code,
            )
        )
    except Exception as exc:
        if not _has_google_api_key():
            raise
        print("Cloud Translation v3 failed, falling back to v2:", exc)
        translations.update(
            _translate_texts_v2(
                pending,
                target_code=target_code,
                source_code=source_code,
            )
        )

    return translations


def _translate_value(value, translation_map: dict[str, str]):
    cleaned = _clean_text(value)
    if not cleaned:
        return value
    return translation_map.get(cleaned, value)


def _collect_menu_texts(result: dict) -> list[str]:
    texts = []
    for item in result.get("menu_items") or []:
        texts.extend(
            [
                item.get("original_name"),
                item.get("description_original"),
                item.get("description"),
                item.get("section_heading_original"),
            ]
        )

    business_description = result.get("business_description") or {}
    if isinstance(business_description, dict):
        for value in business_description.values():
            if isinstance(value, list):
                texts.extend(value)
            else:
                texts.append(value)

    return [_clean_text(text) for text in texts if _clean_text(text)]


def translate_menu_result_with_google(
    result: dict,
    target_lang: str = "zh",
    source_lang: str = "auto",
) -> dict:
    if not isinstance(result, dict):
        return result

    target_lang = normalize_lang(target_lang, "zh")
    source_lang = normalize_lang(source_lang, "auto")
    texts = _collect_menu_texts(result)

    try:
        translation_map = translate_texts(
            texts=texts,
            target_lang=target_lang,
            source_lang=source_lang,
        )
        provider = google_translation_provider_name()
    except Exception as exc:
        print("Google Cloud Translation failed:", exc)
        translation_map = {}
        provider = "google_cloud_translation_failed"

    category_translations = {}
    for item in result.get("menu_items") or []:
        original_name = _clean_text(item.get("original_name"))
        description_original = _clean_text(item.get("description_original") or item.get("description"))
        section_original = _clean_text(item.get("section_heading_original") or item.get("category"))

        if original_name:
            item["translated_name"] = translation_map.get(original_name) or item.get("translated_name") or original_name
        if description_original:
            item["description"] = translation_map.get(description_original) or item.get("description") or ""
        else:
            item["description"] = item.get("description") or ""
        if section_original:
            translated_section = translation_map.get(section_original) or item.get("section_heading_translated") or section_original
            item["section_heading_translated"] = translated_section
            category_translations[section_original] = translated_section

        item["target_language"] = target_lang
        item["translation_provider"] = provider

    business_description = result.get("business_description") or {}
    if isinstance(business_description, dict):
        for key, value in list(business_description.items()):
            if isinstance(value, list):
                business_description[key] = [
                    _translate_value(entry, translation_map)
                    for entry in value
                ]
            else:
                business_description[key] = _translate_value(value, translation_map)

    result["target_language"] = target_lang
    result["translation_provider"] = provider
    if category_translations:
        result["category_translation_map"] = category_translations
    return result


def translate_document_bytes(
    document_bytes: bytes,
    mime_type: str,
    target_lang: str = "zh",
    source_lang: str = "auto",
) -> bytes:
    if not is_google_translation_configured():
        raise RuntimeError("Google Cloud Translation v3 is not configured.")

    import base64

    target_code = _google_language_code(target_lang)
    source_code = _google_language_code(source_lang, source=True)
    endpoint = f"https://translation.googleapis.com/v3/{_translation_parent()}:translateDocument"

    payload = {
        "targetLanguageCode": target_code,
        "documentInputConfig": {
            "mimeType": mime_type,
            "content": base64.b64encode(document_bytes).decode("ascii"),
        },
    }
    if source_code:
        payload["sourceLanguageCode"] = source_code
    if _translation_model_path():
        payload["model"] = _translation_model_path()
    if _glossary_path():
        payload["glossaryConfig"] = {"glossary": _glossary_path()}

    response = requests.post(
        endpoint,
        headers={
            "Authorization": f"Bearer {_get_google_access_token()}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=max(GOOGLE_TRANSLATION_TIMEOUT, 30),
    )
    response.raise_for_status()
    data = response.json()
    byte_stream_outputs = data.get("documentTranslation", {}).get("byteStreamOutputs") or []
    if not byte_stream_outputs:
        raise RuntimeError("Google Cloud Translation v3 returned no translated document bytes.")
    return base64.b64decode(byte_stream_outputs[0])
