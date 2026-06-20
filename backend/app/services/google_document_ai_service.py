import base64
import os
from functools import lru_cache

import requests

from app.core.config import (
    GOOGLE_CLOUD_PROJECT_ID,
    GOOGLE_DOCUMENT_AI_LOCATION,
    GOOGLE_DOCUMENT_AI_PROCESSOR_ID,
)
from app.services.google_translation_service import GOOGLE_CLOUD_PLATFORM_SCOPES, get_google_access_token


DOCUMENT_AI_TIMEOUT = int(os.getenv("GOOGLE_DOCUMENT_AI_TIMEOUT", "45"))
DOCUMENT_AI_MAX_PAGES = int(os.getenv("GOOGLE_DOCUMENT_AI_MAX_PAGES", "5"))
DOCUMENT_AI_AUTO_CREATE_PROCESSOR = os.getenv("GOOGLE_DOCUMENT_AI_AUTO_CREATE_PROCESSOR", "true").lower() in {
    "1",
    "true",
    "yes",
}
DOCUMENT_AI_PROCESSOR_TYPE = os.getenv("GOOGLE_DOCUMENT_AI_PROCESSOR_TYPE", "OCR_PROCESSOR").strip()
DOCUMENT_AI_PROCESSOR_DISPLAY_NAME = os.getenv(
    "GOOGLE_DOCUMENT_AI_PROCESSOR_DISPLAY_NAME",
    "Menu Translator OCR",
).strip()
DOCUMENT_AI_LAST_ERROR: str | None = None


def _document_ai_endpoint(path: str) -> str:
    location = GOOGLE_DOCUMENT_AI_LOCATION or "us"
    host = "documentai.googleapis.com" if location == "global" else f"{location}-documentai.googleapis.com"
    return f"https://{host}/v1/{path.lstrip('/')}"


def _document_ai_headers() -> dict:
    return {
        "Authorization": f"Bearer {get_google_access_token(scopes=GOOGLE_CLOUD_PLATFORM_SCOPES)}",
        "Content-Type": "application/json",
    }


def _processor_parent() -> str:
    if not GOOGLE_CLOUD_PROJECT_ID:
        raise RuntimeError("GOOGLE_CLOUD_PROJECT_ID is required for Document AI.")
    return f"projects/{GOOGLE_CLOUD_PROJECT_ID}/locations/{GOOGLE_DOCUMENT_AI_LOCATION or 'us'}"


def _processor_path(processor_id: str) -> str:
    return f"{_processor_parent()}/processors/{processor_id}"


def _create_document_ai_processor() -> str | None:
    global DOCUMENT_AI_LAST_ERROR
    if not DOCUMENT_AI_AUTO_CREATE_PROCESSOR:
        DOCUMENT_AI_LAST_ERROR = "Auto-create is disabled by GOOGLE_DOCUMENT_AI_AUTO_CREATE_PROCESSOR."
        return None
    if not DOCUMENT_AI_PROCESSOR_TYPE:
        DOCUMENT_AI_LAST_ERROR = "GOOGLE_DOCUMENT_AI_PROCESSOR_TYPE is empty."
        return None

    try:
        response = requests.post(
            _document_ai_endpoint(f"{_processor_parent()}/processors"),
            headers=_document_ai_headers(),
            json={
                "type": DOCUMENT_AI_PROCESSOR_TYPE,
                "displayName": DOCUMENT_AI_PROCESSOR_DISPLAY_NAME or "Menu Translator OCR",
            },
            timeout=DOCUMENT_AI_TIMEOUT,
        )
        response.raise_for_status()
    except Exception as exc:
        detail = getattr(getattr(exc, "response", None), "text", None)
        DOCUMENT_AI_LAST_ERROR = f"Processor creation failed: {exc}. {detail or ''}".strip()
        print("Document AI processor creation failed:", DOCUMENT_AI_LAST_ERROR)
        return None

    processor = response.json() or {}
    name = processor.get("name") or ""
    processor_id = name.rstrip("/").split("/")[-1] or None
    if processor_id:
        print("Document AI processor created:", processor_id)
    return processor_id


@lru_cache(maxsize=1)
def resolve_document_ai_processor_id() -> str | None:
    global DOCUMENT_AI_LAST_ERROR
    if GOOGLE_DOCUMENT_AI_PROCESSOR_ID:
        return GOOGLE_DOCUMENT_AI_PROCESSOR_ID

    try:
        response = requests.get(
            _document_ai_endpoint(f"{_processor_parent()}/processors"),
            headers=_document_ai_headers(),
            timeout=DOCUMENT_AI_TIMEOUT,
        )
        response.raise_for_status()
    except Exception as exc:
        detail = getattr(getattr(exc, "response", None), "text", None)
        DOCUMENT_AI_LAST_ERROR = f"Processor discovery failed: {exc}. {detail or ''}".strip()
        print("Document AI processor discovery failed:", DOCUMENT_AI_LAST_ERROR)
        return _create_document_ai_processor()

    processors = response.json().get("processors") or []
    enabled = [
        processor
        for processor in processors
        if str(processor.get("state") or "").upper().endswith("ENABLED")
    ]
    preferred = []
    for processor in enabled:
        processor_type = str(processor.get("type") or processor.get("displayName") or "").lower()
        if any(token in processor_type for token in ["ocr", "form", "layout"]):
            preferred.append(processor)

    selected = (preferred or enabled or processors or [None])[0]
    if not selected:
        return _create_document_ai_processor()
    name = selected.get("name") or ""
    return name.rstrip("/").split("/")[-1] or None


def is_document_ai_available() -> bool:
    return bool(GOOGLE_CLOUD_PROJECT_ID and resolve_document_ai_processor_id())


def _read_text_anchor(full_text: str, layout: dict) -> str:
    segments = layout.get("textAnchor", {}).get("textSegments") or []
    parts = []
    for segment in segments:
        start = int(segment.get("startIndex") or 0)
        end = int(segment.get("endIndex") or 0)
        if end > start:
            parts.append(full_text[start:end])
    return "".join(parts).strip()


def _layout_to_block(full_text: str, page_index: int, index: int, item: dict, source: str) -> dict | None:
    layout = item.get("layout") or item
    text = _read_text_anchor(full_text, layout)
    if not text:
        return None

    vertices = layout.get("boundingPoly", {}).get("normalizedVertices") or layout.get("boundingPoly", {}).get("vertices") or []
    xs = [float(vertex.get("x", 0)) for vertex in vertices]
    ys = [float(vertex.get("y", 0)) for vertex in vertices]
    if not xs or not ys:
        xs = [0.0, float(len(text) * 8)]
        ys = [float(index * 20), float(index * 20 + 18)]

    scale = 1000.0 if max(xs + ys) <= 1.0 else 1.0
    xs = [x * scale for x in xs]
    ys = [y * scale for y in ys]

    return {
        "text": " ".join(text.split()),
        "x_min": min(xs),
        "y_min": min(ys),
        "x_max": max(xs),
        "y_max": max(ys),
        "center_x": sum(xs) / len(xs),
        "center_y": sum(ys) / len(ys),
        "confidence": float(layout.get("confidence") or 0.9),
        "ocr_lang": source,
        "page": page_index + 1,
    }


def process_document_with_document_ai(
    file_bytes: bytes,
    mime_type: str = "application/pdf",
) -> dict:
    processor_id = resolve_document_ai_processor_id()
    if not processor_id:
        details = DOCUMENT_AI_LAST_ERROR or "No additional error details were returned."
        raise RuntimeError(
            "No Document AI processor is configured or discoverable. "
            f"location={GOOGLE_DOCUMENT_AI_LOCATION or 'us'}, "
            f"auto_create={DOCUMENT_AI_AUTO_CREATE_PROCESSOR}, "
            f"processor_type={DOCUMENT_AI_PROCESSOR_TYPE or 'unset'}. "
            f"{details}"
        )

    endpoint = _document_ai_endpoint(f"{_processor_path(processor_id)}:process")
    payload = {
        "rawDocument": {
            "content": base64.b64encode(file_bytes).decode("ascii"),
            "mimeType": mime_type,
        },
        "processOptions": {
            "individualPageSelector": {
                "pages": [index for index in range(1, DOCUMENT_AI_MAX_PAGES + 1)]
            }
        },
    }

    response = requests.post(
        endpoint,
        headers=_document_ai_headers(),
        json=payload,
        timeout=DOCUMENT_AI_TIMEOUT,
    )
    response.raise_for_status()
    document = response.json().get("document") or {}
    full_text = document.get("text") or ""

    blocks = []
    for page_index, page in enumerate(document.get("pages") or []):
        lines = page.get("lines") or []
        paragraphs = page.get("paragraphs") or []
        source_items = lines or paragraphs
        for index, item in enumerate(source_items):
            block = _layout_to_block(full_text, page_index, index, item, "google_document_ai")
            if block:
                blocks.append(block)

    if not blocks and full_text:
        for index, line in enumerate(full_text.splitlines()):
            line = line.strip()
            if not line:
                continue
            blocks.append(
                {
                    "text": line,
                    "x_min": 0.0,
                    "y_min": float(index * 20),
                    "x_max": float(max(len(line) * 8, 1)),
                    "y_max": float(index * 20 + 18),
                    "center_x": float(max(len(line) * 4, 1)),
                    "center_y": float(index * 20 + 9),
                    "confidence": 0.9,
                    "ocr_lang": "google_document_ai",
                    "page": 1,
                }
            )

    return {
        "text": full_text.strip(),
        "blocks": sorted(blocks, key=lambda item: (item.get("page", 1), item["center_y"], item["center_x"])),
        "processor_id": processor_id,
        "provider": "google_document_ai",
    }


def document_ai_result_to_markdown(result: dict) -> str:
    blocks = result.get("blocks") or []
    lines = ["# Document AI extracted menu text", ""]
    current_page = None
    for block in blocks:
        page = block.get("page", 1)
        if page != current_page:
            current_page = page
            lines.extend([f"## Page {page}", ""])
        text = str(block.get("text") or "").strip()
        if text:
            lines.append(f"- {text}")
    return "\n".join(lines).strip()
