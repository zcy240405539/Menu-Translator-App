from __future__ import annotations

import json
from contextvars import ContextVar, Token
from functools import lru_cache
from html import escape
from pathlib import Path
from urllib.parse import quote


SUPPORTED_LANGUAGES = ("en", "zh", "zh-Hant", "es", "fr", "ja", "ko", "ru", "pt", "de", "it", "ar")
LOCALE_DIR = Path(__file__).resolve().parents[1] / "i18n" / "locales"
_request_language: ContextVar[str] = ContextVar("ui_language", default="en")


def normalize_ui_language(value: str | None) -> str:
    normalized = str(value or "").strip().replace("_", "-").lower()
    if normalized in {"zh", "zh-cn", "zh-hans"}:
        return "zh"
    if normalized in {"zh-tw", "zh-hk", "zh-hant"}:
        return "zh-Hant"
    primary = normalized.split("-", 1)[0]
    return primary if primary in SUPPORTED_LANGUAGES else "en"


def request_language(value: str | None) -> Token:
    return _request_language.set(normalize_ui_language(value))


def reset_request_language(token: Token) -> None:
    _request_language.reset(token)


@lru_cache(maxsize=len(SUPPORTED_LANGUAGES))
def _load_ui_catalog(code: str) -> dict:
    return json.loads((LOCALE_DIR / f"{code}.json").read_text(encoding="utf-8"))


def get_ui_catalog(language: str | None = None) -> dict:
    code = normalize_ui_language(language or _request_language.get())
    return _load_ui_catalog(code)


def ui_text(key: str, language: str | None = None, **values) -> str:
    current = get_ui_catalog(language)
    for part in key.split("."):
        current = current[part]
    return str(current).format(**values)


def _html_language(language: str) -> str:
    if language == "zh":
        return "zh-CN"
    if language == "zh-Hant":
        return "zh-Hant"
    return language


def render_legal_page(kind: str, language: str | None, support_email: str) -> str:
    code = normalize_ui_language(language)
    catalog = get_ui_catalog(code)
    document = catalog["legal"][kind]
    brand = escape(catalog["common"]["brand"])
    contact = escape(catalog["common"]["contact"])
    safe_email = escape(support_email, quote=True)
    direction = "rtl" if code == "ar" else "ltr"

    sections = "".join(
        f"<section><h2>{escape(section['heading'])}</h2><ul>"
        + "".join(f"<li>{escape(item)}</li>" for item in section["items"])
        + "</ul></section>"
        for section in document["sections"]
    )
    intro = escape(document.get("intro") or document.get("subtitle") or "")
    action = ""
    if kind == "deletion":
        subject = quote(document["emailSubject"])
        body = quote(document["emailBody"])
        action = (
            f'<a class="button" href="mailto:{safe_email}?subject={subject}&body={body}">'
            f"{escape(document['emailButton'])}</a>"
        )

    return f"""<!doctype html>
<html lang="{_html_language(code)}" dir="{direction}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{escape(document["title"])} - {brand}</title>
    <style>
      body {{ margin: 0; font-family: Arial, Helvetica, sans-serif; background: #fdf8f3; color: #1d1b20; line-height: 1.65; }}
      main {{ max-width: 860px; margin: 0 auto; padding: 48px 20px; }}
      article {{ background: #fff; border: 1px solid #e6ded8; border-radius: 24px; padding: 30px; }}
      h1 {{ margin-top: 0; font-size: 34px; line-height: 1.2; }}
      h2 {{ margin-top: 30px; font-size: 21px; }}
      ul {{ padding-inline-start: 22px; }}
      a {{ color: #6750a4; font-weight: 700; }}
      a.button {{ display: inline-block; margin-top: 12px; padding: 12px 18px; border-radius: 999px; background: #6750a4; color: #fff; text-decoration: none; }}
      .muted {{ color: #625b71; }}
    </style>
  </head>
  <body>
    <main>
      <article>
        <div class="muted">{brand}</div>
        <h1>{escape(document["title"])}</h1>
        <p>{intro}</p>
        {action}
        {sections}
        <p class="muted">{contact}: <a href="mailto:{safe_email}">{safe_email}</a></p>
      </article>
    </main>
  </body>
</html>"""
