import os
import time
from functools import lru_cache
from typing import Any

from app.core.database import SessionLocal
from app.core.models import AppConfigEntry


APP_CONFIG_CACHE_SECONDS = max(1, int(os.getenv("APP_CONFIG_CACHE_SECONDS", "300")))


def _cache_bucket() -> int:
    return int(time.time() // APP_CONFIG_CACHE_SECONDS)


@lru_cache(maxsize=128)
def _load_namespace(namespace: str, bucket: int) -> tuple[tuple[str, Any], ...]:
    db = SessionLocal()
    try:
        rows = (
            db.query(AppConfigEntry)
            .filter(
                AppConfigEntry.namespace == namespace,
                AppConfigEntry.is_active == True,  # noqa: E712
            )
            .order_by(AppConfigEntry.id.asc())
            .all()
        )
        return tuple((row.key, row.value) for row in rows)
    except Exception as exc:
        print(f"App config load failed for namespace={namespace}: {exc}")
        return tuple()
    finally:
        db.close()


def clear_app_config_cache() -> None:
    _load_namespace.cache_clear()


def get_config_rows(namespace: str) -> list[tuple[str, Any]]:
    return list(_load_namespace(namespace, _cache_bucket()))


def get_config_map(namespace: str) -> dict[str, Any]:
    return {key: value for key, value in get_config_rows(namespace)}


def get_config_list(namespace: str) -> list[Any]:
    values: list[Any] = []
    for key, value in get_config_rows(namespace):
        if isinstance(value, list):
            values.extend(value)
        elif value is None:
            values.append(key)
        else:
            values.append(value)
    return values


def get_config_set(namespace: str) -> set[str]:
    return {str(value).strip() for value in get_config_list(namespace) if str(value).strip()}
