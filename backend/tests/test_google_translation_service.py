import os
import sys
from pathlib import Path

os.environ.setdefault("OPENROUTER_API_KEY", "test-key")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services import google_translation_service


def test_translation_skips_provider_when_glossary_covers_all_texts(monkeypatch=None):
    texts = ["Tapas", "Tortilla Espanola"]
    glossary = {
        "Tapas": "\u5c0f\u5403",
        "Tortilla Espanola": "\u897f\u73ed\u7259\u571f\u8c46\u997c",
    }
    original_load_glossary = google_translation_service._load_database_glossary
    original_translate_v3 = google_translation_service._translate_texts_v3
    original_translate_v2 = google_translation_service._translate_texts_v2

    def fail_provider(*args, **kwargs):
        raise AssertionError("translation provider should not be called")

    def set_attr(name, value):
        if monkeypatch:
            monkeypatch.setattr(google_translation_service, name, value)
        else:
            setattr(google_translation_service, name, value)

    try:
        set_attr("_load_database_glossary", lambda *args, **kwargs: glossary)
        set_attr("_translate_texts_v3", fail_provider)
        set_attr("_translate_texts_v2", fail_provider)

        assert google_translation_service.translate_texts(texts, target_lang="zh", source_lang="en") == glossary
    finally:
        if not monkeypatch:
            google_translation_service._load_database_glossary = original_load_glossary
            google_translation_service._translate_texts_v3 = original_translate_v3
            google_translation_service._translate_texts_v2 = original_translate_v2


def test_v3_translation_accepts_empty_input():
    assert google_translation_service._translate_texts_v3([], target_code="zh-CN", source_code="en") == {}


def test_menu_translation_preserves_product_identity_descriptions(monkeypatch):
    translations = {
        "GARNACHA, SYRAH": "歌海娜，西拉",
        "GARNACHA": "歌海娜",
        "SYRAH": "西拉",
        "Care 'Tinto Sobre Lias' Carinea 2024": "护理“Tinto Sobre Lias”Carinea 2024",
        "BRAVAS POTATOES": "香辣土豆",
        "pepper sauce, alioli": "胡椒酱，蒜泥蛋黄酱",
        "RED": "红葡萄酒",
        "Tapas": "西班牙小吃",
    }
    monkeypatch.setattr(google_translation_service, "translate_texts", lambda **kwargs: translations)
    monkeypatch.setattr(google_translation_service, "google_translation_provider_name", lambda: "test")
    result = {
        "menu_items": [
            {
                "original_name": "GARNACHA, SYRAH",
                "description_original": "Care 'Tinto Sobre Lias' Carinea 2024",
                "section_heading_original": "RED",
            },
            {
                "original_name": "BRAVAS POTATOES",
                "description_original": "pepper sauce, alioli",
                "section_heading_original": "Tapas",
            },
        ]
    }

    translated = google_translation_service.translate_menu_result_with_google(
        result,
        target_lang="zh",
        source_lang="en",
    )

    assert translated["menu_items"][0]["description"] == "Care 'Tinto Sobre Lias' Carinea 2024"
    assert translated["menu_items"][0]["translated_name"] == "歌海娜，西拉"
    assert translated["menu_items"][1]["description"] == "胡椒酱，蒜泥蛋黄酱"


def test_menu_translation_translates_short_comma_terms_individually(monkeypatch):
    translations = {
        "BOBAL, TEMPRANILLO": "博巴尔，天妇罗",
        "BOBAL": "博巴尔",
        "TEMPRANILLO": "丹魄",
        "RED": "红葡萄酒",
    }
    monkeypatch.setattr(google_translation_service, "translate_texts", lambda **kwargs: translations)
    monkeypatch.setattr(google_translation_service, "google_translation_provider_name", lambda: "test")

    result = {
        "menu_items": [
            {
                "original_name": "BOBAL, TEMPRANILLO",
                "section_heading_original": "RED",
            }
        ]
    }

    translated = google_translation_service.translate_menu_result_with_google(
        result,
        target_lang="zh",
        source_lang="en",
    )

    assert translated["menu_items"][0]["translated_name"] == "博巴尔，丹魄"


def test_menu_translation_preserves_wine_identity_suffix(monkeypatch):
    translations = {
        "BOBAL, TEMPRANILLO Kiki & Juan 'Vino Tinto' 2024": "错误的整行翻译",
        "BOBAL, TEMPRANILLO": "错误的组合翻译",
        "BOBAL": "博巴尔",
        "TEMPRANILLO": "丹魄",
        "RED": "红葡萄酒",
    }
    monkeypatch.setattr(google_translation_service, "translate_texts", lambda **kwargs: translations)
    monkeypatch.setattr(google_translation_service, "google_translation_provider_name", lambda: "test")

    result = {
        "menu_items": [
            {
                "original_name": "BOBAL, TEMPRANILLO Kiki & Juan 'Vino Tinto' 2024",
                "section_heading_original": "RED",
            }
        ]
    }

    translated = google_translation_service.translate_menu_result_with_google(
        result,
        target_lang="zh",
        source_lang="en",
    )

    assert translated["menu_items"][0]["translated_name"] == "博巴尔，丹魄 Kiki & Juan 'Vino Tinto' 2024"


def test_regular_mixed_case_dish_name_is_not_treated_as_product_identity():
    assert google_translation_service._leading_uppercase_identity("BBQ Chicken Sandwich") is None


if __name__ == "__main__":
    test_translation_skips_provider_when_glossary_covers_all_texts()
    test_v3_translation_accepts_empty_input()
    print("google translation checks passed")
