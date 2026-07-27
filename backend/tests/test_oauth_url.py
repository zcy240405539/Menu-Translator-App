from urllib.parse import parse_qs, urlparse

import pytest

from app.services.auth_service import build_oauth_authorize_url


def test_oauth_authorize_url_preserves_redirect_query():
    url = build_oauth_authorize_url(
        "facebook",
        "https://aimenu.us.kg/login?lang=zh-cn&next=/history",
        "https://example.supabase.co/",
    )
    parsed = urlparse(url)

    assert parsed.path == "/auth/v1/authorize"
    assert parse_qs(parsed.query) == {
        "provider": ["facebook"],
        "redirect_to": ["https://aimenu.us.kg/login?lang=zh-cn&next=/history"],
    }


def test_oauth_authorize_url_rejects_unknown_provider():
    with pytest.raises(ValueError, match="Unsupported OAuth provider"):
        build_oauth_authorize_url("unknown", "https://aimenu.us.kg/login", "https://example.supabase.co")
