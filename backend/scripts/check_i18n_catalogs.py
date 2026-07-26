from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
LANGUAGES = ("en", "zh", "zh-Hant", "es", "fr", "ja", "ko", "ru", "pt", "de", "it", "ar")
CATALOGS = {
    "APP": (ROOT / "frontend" / "locales", {}),
    "Web": (ROOT / "frontend-web" / "src" / "locales", {"zh": "zh-cn"}),
    "backend": (ROOT / "backend" / "app" / "i18n" / "locales", {}),
}


def leaf_map(value: Any, path: str = "") -> dict[str, tuple[str, Any]]:
    if isinstance(value, dict):
        result = {}
        for key, child in value.items():
            result.update(leaf_map(child, f"{path}.{key}" if path else key))
        return result
    if isinstance(value, list):
        result = {}
        for index, child in enumerate(value):
            result.update(leaf_map(child, f"{path}[{index}]"))
        return result
    return {path: (type(value).__name__, value)}


def validate_catalog_group(name: str, directory: Path, aliases: dict[str, str]) -> None:
    catalogs = {}
    for language in LANGUAGES:
        filename = aliases.get(language, language)
        path = directory / f"{filename}.json"
        assert path.exists(), f"{name}: missing {path.name}"
        catalogs[language] = json.loads(path.read_text(encoding="utf-8"))

    english = leaf_map(catalogs["en"])
    for language, catalog in catalogs.items():
        leaves = leaf_map(catalog)
        assert leaves.keys() == english.keys(), f"{name}/{language}: locale key structure differs from English"
        same_as_english = 0
        for path, (value_type, value) in leaves.items():
            english_type, english_value = english[path]
            assert value_type == english_type, f"{name}/{language}/{path}: expected {english_type}, got {value_type}"
            if isinstance(value, str):
                assert value.strip(), f"{name}/{language}/{path}: empty translation"
                expected_placeholders = set(re.findall(r"\{[^{}]+\}", english_value))
                actual_placeholders = set(re.findall(r"\{[^{}]+\}", value))
                assert actual_placeholders == expected_placeholders, (
                    f"{name}/{language}/{path}: placeholder mismatch "
                    f"{actual_placeholders} != {expected_placeholders}"
                )
                same_as_english += value == english_value
        if language != "en":
            assert same_as_english / len(english) < 0.35, (
                f"{name}/{language}: too many values still match English "
                f"({same_as_english}/{len(english)})"
            )

    print(f"{name}: {len(english)} values x {len(catalogs)} languages")


if __name__ == "__main__":
    for catalog_name, (catalog_dir, code_aliases) in CATALOGS.items():
        validate_catalog_group(catalog_name, catalog_dir, code_aliases)
