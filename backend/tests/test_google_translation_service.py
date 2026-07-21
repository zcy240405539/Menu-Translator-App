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


if __name__ == "__main__":
    test_translation_skips_provider_when_glossary_covers_all_texts()
    test_v3_translation_accepts_empty_input()
    print("google translation checks passed")
