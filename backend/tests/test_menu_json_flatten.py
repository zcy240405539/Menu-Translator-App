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


if __name__ == "__main__":
    test_flatten_nested_section_items()
    print("menu json flatten checks passed")
