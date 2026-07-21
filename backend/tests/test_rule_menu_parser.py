import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.rule_menu_parser import parse_menu_markdown_with_rules


def test_html_heading_menu_items_stay_under_parent_section():
    markdown = """
# Menus
# BREAKFAST
## Coffee
$3 - $9
## Egg Sandwich
$14
## Broccoli Irish Cheddar Quiche
# FOOD
## Crab Cakes
$25
"""

    result = parse_menu_markdown_with_rules(markdown, target_lang="zh", source_lang="en")
    items = result["menu_items"]

    assert [item["original_name"] for item in items] == [
        "Coffee",
        "Egg Sandwich",
        "Broccoli Irish Cheddar Quiche",
        "Crab Cakes",
    ]
    assert items[0]["section_heading_original"] == "BREAKFAST"
    assert items[-1]["section_heading_original"] == "FOOD"
    assert items[1]["price"] == "$14"


def test_pdf_section_default_prices_and_description_lines():
    markdown = """
# Document AI extracted menu text
## Page 1
- Tapas
- 9
- BRAVAS POTATOES pepper sauce, alioli
- COUNTRY HAM
- grilled bread, tomato, garlic
- 22
- Bocadillos & Montaditos
- 13
- BIKINI chorizo, Manchego
- DALI BURGER
- ground short rib, manchego
- shallot, milk bun
- 18
- Raciones
- VERDURAS 14
- MUSHROOMS sherry, thyme
"""

    result = parse_menu_markdown_with_rules(markdown, target_lang="zh", source_lang="en")
    by_name = {item["original_name"]: item for item in result["menu_items"]}

    assert by_name["BRAVAS POTATOES"]["section_heading_original"] == "Tapas"
    assert by_name["BRAVAS POTATOES"]["price"] == "9"
    assert by_name["COUNTRY HAM"]["price"] == "22"
    assert by_name["BIKINI"]["section_heading_original"] == "Bocadillos & Montaditos"
    assert by_name["BIKINI"]["price"] == "13"
    assert by_name["DALI BURGER"]["price"] == "18"
    assert by_name["MUSHROOMS"]["section_heading_original"] == "VERDURAS"
    assert by_name["MUSHROOMS"]["price"] == "14"


def test_numbered_image_ocr_line_splits_multiple_items():
    markdown = """
# Extracted menu text
1. # 1 Buffalo chicken, ranch crema, celery - 4.50 # 14 Shrimp & grits, creole remoulade - 5.75
2. # 2 Rotisserie chicken, queso blanco, cilantro - 4.50
"""

    result = parse_menu_markdown_with_rules(markdown, target_lang="zh", source_lang="en")
    items = result["menu_items"]

    assert [item["original_name"] for item in items] == [
        "#1 Buffalo chicken",
        "#14 Shrimp & grits",
        "#2 Rotisserie chicken",
    ]
    assert items[0]["price"] == "4.50"
    assert items[1]["price"] == "5.75"


if __name__ == "__main__":
    test_html_heading_menu_items_stay_under_parent_section()
    test_pdf_section_default_prices_and_description_lines()
    test_numbered_image_ocr_line_splits_multiple_items()
    print("rule parser checks passed")
