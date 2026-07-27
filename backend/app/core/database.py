from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from pathlib import Path

from app.core import config  # noqa: F401 - loads .env consistently for all services

DATABASE_URL = os.getenv("DATABASE_URL")
DEFAULT_SSL_ROOT_CERT = Path(__file__).resolve().parents[2] / "certs" / "prod-ca-2021.crt"


def database_connect_args(database_url: str) -> dict[str, str]:
    url = make_url(database_url)
    if not url.drivername.startswith("postgresql"):
        return {}

    sslrootcert = os.getenv("DATABASE_SSL_ROOT_CERT")
    if not sslrootcert and DEFAULT_SSL_ROOT_CERT.exists():
        sslrootcert = str(DEFAULT_SSL_ROOT_CERT)

    sslmode = (
        os.getenv("DATABASE_SSLMODE")
        or url.query.get("sslmode")
        or ("verify-full" if sslrootcert else "require")
    )
    connect_args = {"sslmode": str(sslmode)}
    if sslrootcert:
        connect_args["sslrootcert"] = sslrootcert
    return connect_args


engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args=database_connect_args(DATABASE_URL),
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
