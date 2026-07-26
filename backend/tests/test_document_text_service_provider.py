import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services import document_text_service


def test_html_extraction_keeps_repeated_prices_in_distinct_items():
    html = """
    <h2>Breakfast</h2>
    <h3>First dish</h3><p>$14</p>
    <h3>Second dish</h3><p>$14</p>
    <footer><h3>Company</h3><a href="/privacy">Privacy</a></footer>
    """

    markdown = document_text_service._extract_html_markdown_fast(html)

    assert markdown.count("$14") == 2
    assert "Privacy" not in markdown


def test_pdf_auto_prefers_document_ai(monkeypatch=None):
    calls = []

    def set_attr(name, value):
        if monkeypatch:
            monkeypatch.setattr(document_text_service, name, value)
        else:
            setattr(document_text_service, name, value)

    set_attr("_document_ai_configured", lambda: True)
    set_attr("_pdf_document_ai_markdown", lambda *args, **kwargs: calls.append("document_ai") or "doc ai text")
    set_attr("_pdf_vision_markdown", lambda *args, **kwargs: calls.append("openrouter") or "openrouter text")
    set_attr("_pdf_google_vision_markdown", lambda *args, **kwargs: calls.append("google_vision") or "google vision text")
    set_attr("_pdf_text_layer_markdown", lambda *args, **kwargs: calls.append("text_layer") or "text layer")

    assert document_text_service.extract_markdown_from_pdf_bytes(b"%PDF", document_provider="auto") == "doc ai text"
    assert calls == ["document_ai"]


def test_pdf_openrouter_vision_is_explicit(monkeypatch=None):
    calls = []

    def set_attr(name, value):
        if monkeypatch:
            monkeypatch.setattr(document_text_service, name, value)
        else:
            setattr(document_text_service, name, value)

    set_attr("_pdf_vision_markdown", lambda *args, **kwargs: calls.append("openrouter") or "openrouter text")
    set_attr("_pdf_text_layer_markdown", lambda *args, **kwargs: calls.append("text_layer") or "text layer")

    assert (
        document_text_service.extract_markdown_from_pdf_bytes(
            b"%PDF",
            document_provider="openrouter_vision",
        )
        == "openrouter text"
    )
    assert calls == ["openrouter", "text_layer"]


if __name__ == "__main__":
    test_html_extraction_keeps_repeated_prices_in_distinct_items()
    test_pdf_auto_prefers_document_ai()
    test_pdf_openrouter_vision_is_explicit()
    print("document text provider checks passed")
