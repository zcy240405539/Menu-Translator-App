import os
import json
from io import StringIO
from pathlib import Path
from dotenv import load_dotenv


def _env_paths() -> list[Path]:
    return [
        Path.cwd() / ".env",
        Path.cwd() / "backend" / ".env",
        Path(__file__).resolve().parents[2] / ".env",
    ]


def _dotenv_without_multiline_service_json(env_path: Path) -> str:
    lines = env_path.read_text(encoding="utf-8", errors="ignore").splitlines()
    clean_lines = []
    index = 0
    while index < len(lines):
        line = lines[index]
        if not line.startswith("GOOGLE_SERVICE_ACCOUNT_JSON="):
            clean_lines.append(line)
            index += 1
            continue

        value = line.split("=", 1)[1].strip()
        balance = value.count("{") - value.count("}")
        index += 1
        while balance > 0 and index < len(lines):
            balance += lines[index].count("{") - lines[index].count("}")
            index += 1

    return "\n".join(clean_lines)


def _load_dotenv_cleanly() -> None:
    loaded = False
    for env_path in _env_paths():
        if not env_path.exists():
            continue
        load_dotenv(stream=StringIO(_dotenv_without_multiline_service_json(env_path)), override=False)
        loaded = True
    if not loaded:
        load_dotenv()


_load_dotenv_cleanly()


def _load_multiline_service_account_json() -> None:
    existing = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
    if existing:
        try:
            json.loads(existing)
            return
        except Exception:
            pass

    if os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON"):
        return

    for env_path in _env_paths():
        if not env_path.exists():
            continue
        lines = env_path.read_text(encoding="utf-8", errors="ignore").splitlines()
        for index, line in enumerate(lines):
            if not line.startswith("GOOGLE_SERVICE_ACCOUNT_JSON="):
                continue
            value = line.split("=", 1)[1].strip()
            pieces = [value]
            balance = value.count("{") - value.count("}")
            cursor = index + 1
            while balance > 0 and cursor < len(lines):
                pieces.append(lines[cursor])
                balance += lines[cursor].count("{") - lines[cursor].count("}")
                cursor += 1

            candidate = "\n".join(pieces).strip().strip("'\"")
            try:
                json.loads(candidate)
            except Exception:
                continue
            os.environ["GOOGLE_SERVICE_ACCOUNT_JSON"] = candidate
            return


_load_multiline_service_account_json()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash-lite")
OPENROUTER_VISION_MODEL = os.getenv("OPENROUTER_VISION_MODEL", "google/gemini-2.5-flash-lite")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
LAYOUT_MAX_TOKENS = int(os.getenv("LAYOUT_MAX_TOKENS", os.getenv("OPENROUTER_LAYOUT_MAX_TOKENS", "6500")))
VISION_MAX_TOKENS = int(os.getenv("VISION_MAX_TOKENS", os.getenv("OPENROUTER_VISION_MAX_TOKENS", "4000")))

GOOGLE_CLOUD_API = os.getenv("GOOGLE_CLOUD_API")
GOOGLE_CLOUD_PROJECT_ID = (
    os.getenv("GOOGLE_CLOUD_PROJECT_ID")
    or os.getenv("GOOGLE_CLOUD_PROJECT")
    or os.getenv("GCLOUD_PROJECT")
)
GOOGLE_CLOUD_LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "global")
GOOGLE_CLOUD_TRANSLATION_GLOSSARY_ID = os.getenv("GOOGLE_CLOUD_TRANSLATION_GLOSSARY_ID")
GOOGLE_CLOUD_TRANSLATION_MODEL = os.getenv("GOOGLE_CLOUD_TRANSLATION_MODEL")
GOOGLE_CLOUD_ACCESS_TOKEN = os.getenv("GOOGLE_CLOUD_ACCESS_TOKEN")
GOOGLE_APPLICATION_CREDENTIALS_JSON = (
    os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
    or os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")
)
GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
GOOGLE_DOCUMENT_AI_LOCATION = os.getenv("GOOGLE_DOCUMENT_AI_LOCATION", "us")
GOOGLE_DOCUMENT_AI_PROCESSOR_ID = os.getenv("GOOGLE_DOCUMENT_AI_PROCESSOR_ID")

if not OPENROUTER_API_KEY:
    raise RuntimeError("OPENROUTER_API_KEY is missing")
