import os
import sys
from pathlib import Path

os.environ.setdefault("OPENROUTER_API_KEY", "test-key")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

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


if __name__ == "__main__":
    test_flatten_nested_section_items()
    print("menu json flatten checks passed")
