from app.services.menu_currency_service import apply_menu_currency_symbol, detect_menu_currency_symbol


def test_detects_currency_symbols_near_prices():
    assert detect_menu_currency_symbol("Soup $9\nSteak $24") == "$"
    assert detect_menu_currency_symbol("牛肉面 ￥10/份") == "￥"
    assert detect_menu_currency_symbol("€12 wine\n€14 cocktail\n$5 soda") == "€"


def test_ignores_symbols_without_nearby_prices():
    assert detect_menu_currency_symbol("Premium $ menu with no listed prices") is None


def test_applies_only_when_currency_is_missing():
    missing = {"currency": None}
    assert apply_menu_currency_symbol(missing, "Soup $9")["currency"] == "$"

    existing = {"currency": "€"}
    assert apply_menu_currency_symbol(existing, "Soup $9")["currency"] == "€"

    code_only = {"currency": "USD"}
    assert apply_menu_currency_symbol(code_only, "Soup $9")["currency"] == "$"
