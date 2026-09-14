import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.services.menu_layout_service import order_page_blocks, parse_menu_layout_pages
from app.services import gemini_menu_service


def test_pages_and_columns_stay_separate():
    blocks = [{"page": page, "text": f"{page}-{column}-{row}",
               "x_min": column * 500, "x_max": column * 500 + 350,
               "y_min": row * 20} for page in (2, 1) for row in range(4) for column in (0, 1)]
    seen = []

    def parse(page_blocks):
        assert len({b["page"] for b in page_blocks}) == 1
        assert [b["column"] for b in page_blocks] == [1] * 4 + [2] * 4
        seen.extend(page_blocks)
        return {"menu_items": [{"id": "old", "original_name": b["text"], "price": 7} for b in page_blocks]}

    result = parse_menu_layout_pages(blocks, parse)
    assert len(seen) == len(blocks)
    assert [item["source_page"] for item in result["menu_items"]] == [2] * 8 + [1] * 8
    assert len({item["id"] for item in result["menu_items"]}) == 16
    assert order_page_blocks([]) == []
    assert order_page_blocks([{"text": "Soup 7"}]) == [{"text": "Soup 7"}]


def test_failed_page_never_returns_partial_success():
    with pytest.raises(ValueError):
        parse_menu_layout_pages([], lambda blocks: {})
    with pytest.raises(ValueError):
        parse_menu_layout_pages([{"page": 1}, {"page": 2}],
                                lambda blocks: {"menu_items": []} if blocks[0]["page"] == 1 else {})


def test_layout_retains_all_size_prices(monkeypatch):
    def generate(system, prompt, **kwargs):
        assert kwargs["max_output_tokens"] >= 12000
        assert "never just 9.00" in prompt
        return '{"sections":[{"section_heading_original":"SALADS","items":[{"original_name":"Garden Salad","price":"Regular: 9.00 / Large: 15.00"}]}]}'
    monkeypatch.setattr(gemini_menu_service, "_post_gemini_generate", generate)
    result = gemini_menu_service.call_gemini_for_menu_layout([], source_lang="en")
    assert result["menu_items"][0]["price"] == "Regular: 9.00 / Large: 15.00"


def test_output_limit_is_failure_not_repaired_partial_menu(monkeypatch):
    class Response:
        status_code = 200
        def json(self):
            return {"candidates": [{"finishReason": "MAX_TOKENS", "content": {"parts": [{"text": "{}"}]}}]}
    monkeypatch.setattr(gemini_menu_service, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(gemini_menu_service.requests, "post", lambda *args, **kwargs: Response())
    with pytest.raises(RuntimeError, match="output limit"):
        gemini_menu_service._post_gemini_generate("system", "menu")


def test_cached_dish_does_not_overwrite_current_menu_translation(monkeypatch):
    from app.services import dish_cache_service as cache
    monkeypatch.setattr(cache, "build_normalized_dish_key", lambda *args: "salad")
    monkeypatch.setattr(cache, "is_cacheable_normalized_name", lambda value: True)
    old = SimpleNamespace(normalized_name="salad", translated_name="old name", description="old recipe",
                          ingredients=[], allergens=[], spicy_level=0, image_prompt="", cuisine="Other")
    class Query:
        def __init__(self, model):
            self.model = model
        def filter(self, *args):
            return self
        def all(self):
            return [old] if self.model is cache.DishCache else []
    db = SimpleNamespace(query=Query)
    items, _ = cache.apply_cache_to_items(db, [{"original_name": "Salad", "translated_name": "fresh name",
                                               "description": "fresh recipe", "price": "7"}], "zh")
    assert items[0]["translated_name"] == "fresh name"
    assert items[0]["description"] == "fresh recipe"
    assert items[0]["price"] == "7"
