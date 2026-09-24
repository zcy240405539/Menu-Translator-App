import os
import sys
from pathlib import Path

os.environ.setdefault("OPENROUTER_API_KEY", "test-key")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services import openrouter_service
from app.services.openrouter_service import flatten_nested_menu_json


def test_flatten_nested_section_items():
    result = flatten_nested_menu_json(
        {
            "source_language": "es",
            "target_language": "zh",
            "sections": [
                {
                    "section_heading_original": "Raciones",
                    "items": [
                        {
                            "section_heading_original": "VERDURAS",
                            "items": [
                                {
                                    "original_name": "MUSHROOMS",
                                    "price": 14,
                                    "description_original": "sherry, thyme",
                                }
                            ],
                        }
                    ],
                }
            ],
        }
    )

    assert len(result["menu_items"]) == 1
    assert result["menu_items"][0]["original_name"] == "MUSHROOMS"
    assert result["menu_items"][0]["section_heading_original"] == "VERDURAS"


def test_text_menu_parser_flattens_grouped_response(monkeypatch):
    captured = {}

    def fake_post(payload, timeout):
        captured["payload"] = payload
        return {
            "choices": [
                {
                    "message": {
                        "content": """{
                            "source_language": "en",
                            "target_language": "zh",
                            "sections": [{
                                "section_heading_original": "RED",
                                "section_heading_translated": "",
                                "items": [{
                                    "original_name": "GARNACHA, SYRAH",
                                    "description_original": "Care Carinea 2024",
                                    "price": 7
                                }]
                            }]
                        }"""
                    }
                }
            ]
        }

    monkeypatch.setenv("OPENROUTER_LAYOUT_MODEL_EN", "test/quality-model")
    monkeypatch.setattr(openrouter_service, "_post_openrouter", fake_post)

    result = openrouter_service.call_openrouter_for_menu(
        "RED\nGARNACHA, SYRAH Care Carinea 2024 7",
        target_lang="zh",
        source_lang="en",
    )

    assert captured["payload"]["model"] == "test/quality-model"
    assert result["analysis_prompt"] == "grouped_text_menu"
    assert result["menu_items"][0]["section_heading_original"] == "RED"
    assert result["menu_items"][0]["description_original"] == "Care Carinea 2024"


def test_sanitize_separates_inline_description_and_preserves_option_prices():
    result = openrouter_service.sanitize_menu_result_structure(
        {
            "source_language": "en",
            "menu_items": [
                {
                    "original_name": "INSALATA VERDE | GREEN LEAF LETTUCE",
                    "description_original": "CAPER DRESSING 10.00 LARGE 18.00",
                    "price": "10.00",
                    "section_heading_original": "INSALATA",
                }
            ],
        }
    )

    item = result["menu_items"][0]
    assert item["original_name"] == "INSALATA VERDE"
    assert item["description_original"].startswith("GREEN LEAF LETTUCE")
    assert item["price"] == "10.00 / LARGE: 18.00"


def test_sanitize_merges_separate_option_price_row_into_previous_dish():
    result = openrouter_service.sanitize_menu_result_structure(
        {
            "source_language": "en",
            "menu_items": [
                {
                    "original_name": "ROSEMARY BREAD",
                    "description_original": "DRESSED WITH OLIVE OIL",
                    "price": None,
                    "section_heading_original": "STARTERS",
                },
                {
                    "original_name": "INITIAL BREAD IS COMPLIMENTARY",
                    "description_original": "",
                    "price": None,
                    "section_heading_original": "STARTERS",
                },
                {
                    "original_name": "ADDITIONAL ORDERS",
                    "description_original": "",
                    "price": "1/2 ROUND 6.00 / FULL ROUND 12.00",
                    "section_heading_original": "STARTERS",
                },
            ],
        }
    )

    assert result["menu_items"][0]["price"] == "1/2 ROUND 6.00 / FULL ROUND 12.00"
    assert all(item["original_name"] != "ADDITIONAL ORDERS" for item in result["menu_items"])


def test_sanitize_merges_individual_size_rows_into_previous_dish():
    result = openrouter_service.sanitize_menu_result_structure(
        {
            "source_language": "en",
            "menu_items": [
                {
                    "original_name": "ROSEMARY BREAD",
                    "description_original": "DRESSED WITH OLIVE OIL",
                    "price": None,
                    "section_heading_original": "STARTERS",
                },
                {
                    "original_name": "ADDITIONAL ORDERS",
                    "description_original": "",
                    "price": None,
                    "section_heading_original": "STARTERS",
                },
                {
                    "original_name": "1/2 ROUND",
                    "description_original": "",
                    "price": "6.00",
                    "section_heading_original": "STARTERS",
                },
                {
                    "original_name": "FULL ROUND",
                    "description_original": "",
                    "price": "12.00",
                    "section_heading_original": "STARTERS",
                },
            ],
        }
    )

    assert result["menu_items"][0]["price"] == "6.00 / 12.00"
    assert all(item["original_name"] not in {"1/2 ROUND", "FULL ROUND"} for item in result["menu_items"])


def test_vision_model_candidates_start_with_language_override(monkeypatch):
    captured_models = []

    def fake_post(payload, timeout):
        captured_models.append(payload["model"])
        return {"choices": [{"message": {"content": '{"ocr_lines":["SOUP | $8"]}'}}]}

    monkeypatch.setenv("OPENROUTER_VISION_MODEL_EN", "google/quality-vision")
    monkeypatch.setattr(openrouter_service, "VISION_FALLBACK_MODELS", [
        "google/fallback-vision",
        "google/quality-vision",
    ])
    monkeypatch.setattr(openrouter_service, "_post_openrouter", fake_post)

    openrouter_service.call_openrouter_vision_for_menu(b"image", source_lang="en")

    assert captured_models == ["google/quality-vision"]


if __name__ == "__main__":
    test_flatten_nested_section_items()
    print("menu json flatten checks passed")
