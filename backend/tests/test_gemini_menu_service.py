import os
import sys
from pathlib import Path

os.environ.setdefault("GEMINI_API_KEY", "test-key")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services import gemini_menu_service


def test_gemini_text_menu_parser_flattens_grouped_response(monkeypatch):
    captured = {}

    def fake_generate(system_prompt, user_prompt, **kwargs):
        captured["prompt"] = user_prompt
        return """{
            "source_language": "en",
            "target_language": "zh",
            "sections": [{
                "section_heading_original": "RED",
                "items": [{
                    "original_name": "GARNACHA, SYRAH",
                    "description_original": "Care Carinea 2024",
                    "price": 7
                }]
            }]
        }"""

    monkeypatch.setattr(gemini_menu_service, "_post_gemini_generate", fake_generate)

    result = gemini_menu_service.call_gemini_for_menu(
        "RED\nGARNACHA, SYRAH Care Carinea 2024 7",
        target_lang="zh",
        source_lang="en",
    )

    assert "vintage year, never a price" in captured["prompt"]
    assert result["menu_items"][0]["section_heading_original"] == "RED"
    assert result["menu_items"][0]["description_original"] == "Care Carinea 2024"
