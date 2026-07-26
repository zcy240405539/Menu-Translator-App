import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.language_modules import detect_source_language, get_language_profile
from app.language_modules.base import SUPPORTED_PROFILE_CODES


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


@pytest.mark.parametrize(
    ("expected", "text"),
    [
        ("zh", "招牌菜\n宫保鸡丁 28元\n鱼香肉丝 26元"),
        ("zh-Hant", "餐廳菜單\n招牌雞湯 280元\n海鮮炒飯 220元"),
        ("fr", "ENTRÉES\nSoupe à l'oignon avec crème\nPLATS\nBœuf poêlé maison"),
        ("ja", "おすすめ\n寿司盛り合わせ 1800円\n天ぷらうどん 1200円"),
        ("ko", "추천 메뉴\n불고기 18,000원\n김치찌개 12,000원"),
        ("ru", "ЗАКУСКИ\nБорщ со сметаной 450 ₽\nПельмени 520 ₽"),
        ("pt", "ENTRADAS\nBacalhau com limão\nPRATOS\nFeijoada da casa"),
        ("de", "VORSPEISEN\nSuppe mit Gemüse\nHAUPTGERICHTE\nSchnitzel mit Käse"),
        ("it", "ANTIPASTI\nBurrata con pomodoro\nPRIMI\nRisotto al parmigiano"),
        ("ar", "المقبلات\nحمص بالطحينة ٢٠\nالأطباق الرئيسية\nكباب مشوي ٤٥"),
    ],
)
def test_auto_detects_supported_menu_languages(expected, text):
    assert detect_source_language(extracted_markdown=text, requested_source_lang="auto") == expected


def test_every_supported_language_has_its_own_profile():
    assert tuple(SUPPORTED_PROFILE_CODES) == (
        "en", "zh", "zh-Hant", "es", "fr", "ja", "ko", "ru", "pt", "de", "it", "ar"
    )
    for code in SUPPORTED_PROFILE_CODES:
        assert get_language_profile(code).code == code


if __name__ == "__main__":
    test_english_menu_with_mexican_food_terms_stays_english()
    test_spanish_menu_with_accents_stays_spanish()
    print("language detection checks passed")
