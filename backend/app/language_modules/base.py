from __future__ import annotations

import importlib
import os
import re
from dataclasses import dataclass, field
from functools import lru_cache

from app.core.i18n_service import normalize_lang


@dataclass(frozen=True)
class LanguageProfile:
    code: str
    family: str
    display_name: str
    aliases: tuple[str, ...] = ()
    local_ocr_lang: str = "auto"
    default_image_document_provider: str = "document_ai"
    openrouter_layout_model_env: str | None = None
    gemini_structure_model_env: str | None = None
    ocr_rules: tuple[str, ...] = ()
    layout_rules: tuple[str, ...] = ()
    markdown_rules: tuple[str, ...] = ()
    price_rules: tuple[str, ...] = ()
    bilingual_rules: tuple[str, ...] = ()
    section_noise_rules: tuple[str, ...] = ()
    unit_rules: tuple[str, ...] = ()
    cuisine_hints: tuple[str, ...] = ()
    detection_stopwords: tuple[str, ...] = ()
    detection_regexes: tuple[str, ...] = ()
    default_noise_keywords: tuple[str, ...] = ()
    default_unit_terms: tuple[tuple[str, str], ...] = field(default_factory=tuple)

    @property
    def openrouter_layout_model(self) -> str | None:
        if not self.openrouter_layout_model_env:
            return None
        return os.getenv(self.openrouter_layout_model_env)

    @property
    def gemini_structure_model(self) -> str | None:
        if not self.gemini_structure_model_env:
            return None
        return os.getenv(self.gemini_structure_model_env)


SUPPORTED_PROFILE_CODES = ("en", "zh", "zh-Hant", "es")


@lru_cache(maxsize=16)
def get_language_profile(source_lang: str | None) -> LanguageProfile:
    normalized = normalize_lang(source_lang, "en")
    if normalized == "zh-Hant":
        module_name = "zh"
    elif normalized in {"en", "zh", "es"}:
        module_name = normalized
    else:
        module_name = "en"

    module = importlib.import_module(f"app.language_modules.{module_name}.profile")
    profile = module.PROFILE
    if normalized == "zh-Hant" and profile.code == "zh":
        return LanguageProfile(
            **{
                **profile.__dict__,
                "code": "zh-Hant",
                "display_name": "Traditional Chinese",
            }
        )
    return profile


def _text_from_blocks_or_markdown(
    extracted_markdown: str | None = None,
    ocr_blocks: list[dict] | None = None,
) -> str:
    if ocr_blocks:
        block_text = "\n".join(str(block.get("text") or "") for block in ocr_blocks)
        if block_text.strip():
            return block_text
    return str(extracted_markdown or "")


def detect_source_language(
    extracted_markdown: str | None = None,
    ocr_blocks: list[dict] | None = None,
    requested_source_lang: str | None = None,
) -> str:
    requested = normalize_lang(requested_source_lang, "auto")
    if requested != "auto":
        return requested

    text = _text_from_blocks_or_markdown(extracted_markdown, ocr_blocks)
    if not text.strip():
        return "en"

    compact = re.sub(r"\s+", " ", text.lower())
    cjk_count = len(re.findall(r"[\u3400-\u9fff]", text))
    latin_count = len(re.findall(r"[a-zA-ZÀ-ÿ]", text))
    total_letters = max(1, cjk_count + latin_count)
    if cjk_count >= 6 and cjk_count / total_letters >= 0.18:
        return "zh"

    scores: dict[str, float] = {"en": 0.0, "es": 0.0}
    for code in ("en", "es"):
        profile = get_language_profile(code)
        for word in profile.detection_stopwords:
            if re.search(rf"(?<![a-zÀ-ÿ]){re.escape(word.lower())}(?![a-zÀ-ÿ])", compact):
                scores[code] += 1.0
        for pattern in profile.detection_regexes:
            scores[code] += len(re.findall(pattern, compact, flags=re.IGNORECASE)) * 1.5

    if scores["es"] >= max(2.0, scores["en"] + 1.0):
        return "es"
    return "en"


def resolve_source_language(
    requested_source_lang: str | None = None,
    extracted_markdown: str | None = None,
    ocr_blocks: list[dict] | None = None,
) -> str:
    return detect_source_language(
        extracted_markdown=extracted_markdown,
        ocr_blocks=ocr_blocks,
        requested_source_lang=requested_source_lang,
    )


def build_language_prompt_context(source_lang: str | None, target_lang: str | None = None) -> str:
    profile = get_language_profile(source_lang)
    sections = [
        ("OCR rules", profile.ocr_rules),
        ("Layout rules", profile.layout_rules),
        ("Markdown rules", profile.markdown_rules),
        ("Price and unit rules", profile.price_rules + profile.unit_rules),
        ("Bilingual rules", profile.bilingual_rules),
        ("Noise and non-menu rules", profile.section_noise_rules),
        ("Cuisine hints", profile.cuisine_hints),
    ]

    lines = [
        f"Source-language module: {profile.code} ({profile.display_name}).",
        "Apply only these source-language-specific rules in addition to the universal menu rules:",
    ]
    for title, rules in sections:
        if not rules:
            continue
        lines.append(f"{title}:")
        lines.extend(f"- {rule}" for rule in rules)

    return "\n".join(lines).strip()
