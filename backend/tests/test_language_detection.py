import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.language_modules import detect_source_language


def test_english_menu_with_mexican_food_terms_stays_english():
    text = """
    # 1 Buffalo chicken, ranch crema, queso, corn tortilla - 4.50
    # 2 Rotisserie chicken with cilantro and tomato salsa - 4.50
    # 3 Nashville hot tofu with slaw and pickles - 4.95
    """

    assert detect_source_language(extracted_markdown=text, requested_source_lang="auto") == "en"


def test_spanish_menu_with_accents_stays_spanish():
    text = """
    Tapas
    TORTILLA ESPAÑOLA
    EGGS DIABLO mezcladillo, pimentón
    RAZOR CLAMS DE LA PLANCHA
    """

    assert detect_source_language(extracted_markdown=text, requested_source_lang="auto") == "es"


if __name__ == "__main__":
    test_english_menu_with_mexican_food_terms_stays_english()
    test_spanish_menu_with_accents_stays_spanish()
    print("language detection checks passed")
