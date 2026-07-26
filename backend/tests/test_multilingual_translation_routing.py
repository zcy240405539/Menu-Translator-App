import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.i18n_service import normalize_lang
from app.services import google_translation_service, google_vision_service
from app.services.ocr_service import normalize_ocr_lang
from app.services.rule_menu_parser import parse_menu_markdown_with_rules


LANGUAGE_CASES = (
    ("zh", "zh-CN", "ch"),
    ("zh-Hant", "zh-TW", "ch"),
    ("es", "es", "en"),
    ("fr", "fr", "fr"),
    ("ja", "ja", "japan"),
    ("ko", "ko", "korean"),
    ("ru", "ru", "cyrillic"),
    ("pt", "pt", "latin"),
    ("de", "de", "german"),
    ("it", "it", "latin"),
    ("ar", "ar", "arabic"),
)

MENU_CASES = (
    ("en", "# Mains\nGrilled chicken $12\nFish and chips $14"),
    ("zh", "# 招牌菜\n宫保鸡丁 28元\n鱼香肉丝 26元"),
    ("zh-Hant", "# 招牌菜\n宮保雞丁 280元\n海鮮炒飯 220元"),
    ("es", "# Tapas\nTortilla española 9,50 €\nPatatas bravas 8,00 €"),
    ("fr", "# Plats\nSoupe à l'oignon 9,50 €\nBœuf bourguignon 18,00 €"),
    ("ja", "# おすすめ\n寿司盛り合わせ 1800円\n天ぷらうどん 1200円"),
    ("ko", "# 추천\n불고기 18,000원\n김치찌개 12,000원"),
    ("ru", "# Супы\nБорщ со сметаной 450 ₽\nСолянка 520 ₽"),
    ("pt", "# Pratos\nBacalhau grelhado 18,50 €\nFeijoada 14,00 €"),
    ("de", "# Hauptgerichte\nSchweineschnitzel 16,90 €\nKäsespätzle 13,50 €"),
    ("it", "# Primi\nSpaghetti alla carbonara 13,00 €\nRisotto ai funghi 15,00 €"),
    ("ar", "# الأطباق الرئيسية\nحمص بالطحينة ٢٠ ر.س\nكباب مشوي ٤٥ ر.س"),
)


@pytest.mark.parametrize(("language", "google_code", "ocr_code"), LANGUAGE_CASES)
def test_language_routes_to_google_and_ocr(language, google_code, ocr_code):
    assert normalize_lang(language) == language
    assert google_translation_service._google_language_code(language) == google_code
    assert normalize_ocr_lang(language) == ocr_code


def test_every_language_routes_both_directions_with_english(monkeypatch):
    calls = []

    monkeypatch.setattr(google_translation_service, "_load_database_glossary", lambda *_: {})
    monkeypatch.setattr(google_translation_service, "is_google_translation_configured", lambda: True)
    monkeypatch.setattr(
        google_translation_service,
        "_translate_texts_v3",
        lambda texts, target_code, source_code: (
            calls.append((source_code, target_code)) or {text: f"{target_code}:{text}" for text in texts}
        ),
    )

    for language, google_code, _ in LANGUAGE_CASES:
        google_translation_service.translate_texts(["menu item"], target_lang="en", source_lang=language)
        google_translation_service.translate_texts(["menu item"], target_lang=language, source_lang="en")
        assert (google_code, "en") in calls
        assert ("en", google_code) in calls


@pytest.mark.parametrize(("source_language", "markdown"), MENU_CASES)
def test_each_source_language_structures_names_categories_and_prices(source_language, markdown):
    result = parse_menu_markdown_with_rules(markdown, target_lang="en", source_lang=source_language)

    assert result["source_language"] == source_language
    assert result["target_language"] == "en"
    assert len(result["menu_items"]) == 2
    assert all(item["original_name"] and item["category"] != "menu" and item["price"] for item in result["menu_items"])


@pytest.mark.parametrize("target_language", [case[0] for case in LANGUAGE_CASES])
def test_english_menu_structures_for_each_target_language(target_language):
    result = parse_menu_markdown_with_rules(
        "# Mains\nGrilled chicken $12\nFish and chips $14",
        target_lang=target_language,
        source_lang="en",
    )

    assert result["target_language"] == target_language
    assert len(result["menu_items"]) == 2


def test_google_vision_uses_only_the_requested_language_hint(monkeypatch):
    payloads = []

    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {"responses": [{}]}

    monkeypatch.setattr(google_vision_service, "GOOGLE_CLOUD_API", "test-key")
    monkeypatch.setattr(
        google_vision_service.requests,
        "post",
        lambda *args, **kwargs: payloads.append(kwargs["json"]) or Response(),
    )

    for language, google_code, _ in LANGUAGE_CASES:
        google_vision_service.call_google_vision_text_detection(b"image", source_lang=language)
        request = payloads[-1]["requests"][0]
        assert request["imageContext"]["languageHints"] == [google_code]

    google_vision_service.call_google_vision_text_detection(b"image", source_lang="auto")
    assert "imageContext" not in payloads[-1]["requests"][0]
