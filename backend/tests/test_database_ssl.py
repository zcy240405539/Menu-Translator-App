import os
import sys
from pathlib import Path

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import database_connect_args


def test_postgres_requires_ssl_by_default(monkeypatch):
    monkeypatch.delenv("DATABASE_SSLMODE", raising=False)
    monkeypatch.delenv("DATABASE_SSL_ROOT_CERT", raising=False)

    assert database_connect_args("postgresql://user:pass@example.com/db") == {
        "sslmode": "require"
    }


def test_postgres_verify_full_uses_configured_certificate(monkeypatch):
    monkeypatch.setenv("DATABASE_SSLMODE", "verify-full")
    monkeypatch.setenv("DATABASE_SSL_ROOT_CERT", "/run/secrets/supabase-ca.crt")

    assert database_connect_args("postgresql://user:pass@example.com/db") == {
        "sslmode": "verify-full",
        "sslrootcert": "/run/secrets/supabase-ca.crt",
    }


def test_non_postgres_has_no_ssl_arguments():
    assert database_connect_args("sqlite:///:memory:") == {}
