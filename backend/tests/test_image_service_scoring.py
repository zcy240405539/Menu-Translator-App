import os
import sys
from pathlib import Path

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-key")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services import image_service


image_service.get_negative_image_terms = lambda: set()
image_service.get_image_source_score_bonus = lambda: {"wikimedia_found": 18}
image_service.get_dish_search_aliases = lambda: {}
image_service.get_dish_image_conflict_terms = lambda: {}
image_service.resolve_dish_cuisine = lambda dish: "Spanish"
image_service.build_normalized_dish_key = lambda *names: next((name for name in names if name), "")


def test_single_word_exact_match_needs_food_context():
    dish = {
        "original_name": "Bikini",
        "translated_name": "Bikini sandwich",
        "ingredients": ["chorizo", "Manchego"],
        "category": "Tapas",
    }

    wrong = image_service.make_image_candidate(
        image_url="https://example.com/bikini.jpg",
        source_type="wikimedia_found",
        title="Bikini - Wikipedia",
    )
    right = image_service.make_image_candidate(
        image_url="https://example.com/bikini-sandwich.jpg",
        source_type="wikimedia_found",
        title="Bikini sandwich with chorizo and Manchego",
    )

    assert image_service.score_image_candidate(wrong, dish, "Bikini") < image_service.IMAGE_SEARCH_MIN_SCORE
    assert image_service.score_image_candidate(right, dish, "Bikini sandwich") >= image_service.IMAGE_SEARCH_MIN_SCORE


def test_openai_image_model_suffix_is_ignored():
    assert image_service.normalize_openai_image_model("gpt-image-1-mini:nitro") == "gpt-image-1-mini"
    assert image_service.normalize_openai_image_model("dall-e-3:fast") == "dall-e-3"
    assert image_service.normalize_openai_image_model("custom/image:model") == "custom/image:model"


if __name__ == "__main__":
    test_single_word_exact_match_needs_food_context()
    test_openai_image_model_suffix_is_ignored()
    print("image scoring checks passed")
