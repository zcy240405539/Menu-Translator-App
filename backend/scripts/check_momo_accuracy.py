"""Named-dish recall and printed-price check for the user's two MOMO photos.

This is an evaluation sample, never imported by the production parser.
Prices in the glare-obscured cocktail area are deliberately not scored.
Name matching ignores punctuation, dietary suffixes and trailing descriptions.
"""
import json
import re
import sys
from pathlib import Path

EXPECTED = [
    (1, "House Focaccia Bread", [6, 12]),
    (1, "Momo Bruschetta", [10]),
    (1, "Whipped Ricotta", [12]),
    (1, "Tortelloni di Bresaola con Ricotta", [18]),
    (1, "Olives", [7]), (1, "Acciughe", [7]),
    (1, "Calamari Fritti", [16]), (1, "Formaggi", [14]),
    (1, "Antipasto Board", [24]), (1, "Carne e Formaggi The Big Board", [38]),
    (1, "Bresaola", [23]), (1, "Carpaccio di Manzo", [23]),
    (1, "Lamb Meatballs", [20]), (1, "Mozzarella con Pomodoro", [14]),
    (1, "Ruby Beet Salad", [14]), (1, "Insalata Verde", [10, 18]),
    (1, "Insalata Primavera", [10, 18]), (1, "Insalata Fantasia", [16, 26]),
    (1, "Funghi Freschi", [12, 24]), (1, "Insalata alla Momo", [24, 36]),
    (1, "Bergotto Italian Citrus Sparkling Soda", [6]),
    (1, "Baladin Italian All Natural Soda", [6]), (1, "Iced Tea", [3.5]),
    (1, "Momo Italian Tea", [6]),
    (1, "Ferrarelle Italian Sparkling Water", [10]),
    (1, "Ferrarelle Italian Still Water", [10]), (1, "Coke", [4]),
    (2, "Mandilli de Seta", [25]), (2, "Maccheroni alla Vesuviana", [24]),
    (2, "Conchiglie ai Quattro Formaggi", [24]), (2, "Scialatielli di Aragosta", [38]),
    (2, "Capelli d'Angelo alla Momo", [34]), (2, "Tortelli di Spinaci", [26]),
    (2, "Fettuccine alla Santalloro", [24]), (2, "Gnocchi alla Salsiccia", [26]),
    (2, "Conchiglie a Modo Mio", [26]), (2, "Pappardelle Integrale alla Bianco Bolognese", [27]),
    (2, "Ravioli di Carne", [26]), (2, "Fettuccine ai Carne e Funghi", [27]),
    (2, "Lasagne alla Bolognese", [32]), (2, "Rotolo Verde", [25]),
    (2, "Ris in Cagnon", [32]), (2, "Risotto alle Verdue", [28]),
    (2, "Risotto ai Funghi", [30]), (2, "Risotto alla Aragosta", [36]),
    (2, "Gamberi alla Momo", [36]), (2, "Market Fish", []),
    (2, "Piccata di Pollo", [27]), (2, "Pork Milanese", [27]),
    (2, "Scaloppine al Limone", [29]), (2, "Piselli al Prosciutto", [10]),
    (2, "Gnudi di Ricotta e Spinaci", [10]), (2, "Spinaci", [9]),
    (2, "Brussel Sprouts", [12]), (2, "Cheese Pizza", [12, 16]),
    (2, "Margherita", [14, 18]), (2, "Alla Boscaiola", [14, 18]),
    (2, "Ai Quattro Formaggi", [15, 20]), (2, "Capriccioso", [16, 22]),
    (2, "Con Salsiccia", [18, 23]), (2, "Rustico", [18, 23]),
]


def normalized(value):
    return re.sub(r"[^a-z0-9]", "", value.lower())


def score(result):
    items = result.get("menu_items", [])
    found, priced, problems = 0, 0, []
    for page, name, prices in EXPECTED:
        matches = [item for item in items
                   if item.get("source_page", page) == page
                   and normalized(item.get("original_name", "")).startswith(normalized(name))]
        if not matches:
            problems.append({"name": name, "issue": "missing"})
            continue
        found += 1
        actual = {float(n) for n in re.findall(r"\d+(?:\.\d+)?", str(matches[0].get("price") or ""))}
        if set(prices).issubset(actual) and (prices or not actual):
            priced += 1
        else:
            problems.append({"name": name, "expected_prices": prices, "actual": matches[0].get("price")})
    return {"total_output_rows": len(items), "expected_dishes": len(EXPECTED),
            "named_dishes_found": found, "dishes_with_all_printed_prices": priced,
            "problems": problems}


if __name__ == "__main__":
    for filename in sys.argv[1:]:
        data = json.loads(Path(filename).read_text(encoding="utf-8"))
        print(json.dumps({"file": filename, **score(data.get("result", data))}, ensure_ascii=False, indent=2))
