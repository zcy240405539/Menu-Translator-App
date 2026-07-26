from app.core.ui_i18n import (
    SUPPORTED_LANGUAGES,
    get_ui_catalog,
    render_legal_page,
    request_language,
    reset_request_language,
    ui_text,
)


def test_all_ui_catalogs_and_legal_pages_are_available():
    for language in SUPPORTED_LANGUAGES:
        catalog = get_ui_catalog(language)
        assert catalog["common"]["brand"] == "AI Menu APP"
        assert catalog["legal"]["privacy"]["sections"]
        assert catalog["legal"]["terms"]["sections"]
        assert catalog["legal"]["deletion"]["sections"]

        page = render_legal_page("privacy", language, "support@aimenu.us.kg")
        assert catalog["legal"]["privacy"]["title"] in page
        assert f'lang="{"zh-CN" if language == "zh" else language}"' in page

    assert 'dir="rtl"' in render_legal_page("privacy", "ar", "support@aimenu.us.kg")


def test_request_language_controls_api_error_text():
    token = request_language("es")
    try:
        assert ui_text("errors.taskNotFound") == get_ui_catalog("es")["errors"]["taskNotFound"]
    finally:
        reset_request_language(token)
