import base64
import os

import requests

from app.core.config import GOOGLE_CLOUD_API
from app.services.google_translation_service import GOOGLE_CLOUD_PLATFORM_SCOPES, get_google_access_token


GOOGLE_VISION_TIMEOUT = int(os.getenv("GOOGLE_VISION_TIMEOUT", "20"))
GOOGLE_VISION_MAX_RESULTS = int(os.getenv("GOOGLE_VISION_MAX_RESULTS", "1"))


def _vision_headers() -> dict:
    return {
        "Authorization": f"Bearer {get_google_access_token(scopes=GOOGLE_CLOUD_PLATFORM_SCOPES)}",
        "Content-Type": "application/json",
    }


def _text_anchor_to_block(page_index: int, index: int, item: dict, source: str) -> dict | None:
    description = (item.get("description") or "").strip()
    if not description:
        return None

    vertices = item.get("boundingPoly", {}).get("vertices") or []
    xs = [float(vertex.get("x", 0)) for vertex in vertices]
    ys = [float(vertex.get("y", 0)) for vertex in vertices]

    if not xs or not ys:
        xs = [0.0, float(len(description) * 8)]
        ys = [float(index * 20), float(index * 20 + 18)]

    return {
        "text": description,
        "x_min": min(xs),
        "y_min": min(ys),
        "x_max": max(xs),
        "y_max": max(ys),
        "center_x": sum(xs) / len(xs),
        "center_y": sum(ys) / len(ys),
        "confidence": 0.9,
        "ocr_lang": source,
        "page": page_index + 1,
    }


def _vertices_to_box(vertices: list[dict], index: int, text: str) -> dict:
    xs = [float(vertex.get("x", 0)) for vertex in vertices]
    ys = [float(vertex.get("y", 0)) for vertex in vertices]
    if not xs or not ys:
        xs = [0.0, float(len(text) * 8)]
        ys = [float(index * 20), float(index * 20 + 18)]

    return {
        "x_min": min(xs),
        "y_min": min(ys),
        "x_max": max(xs),
        "y_max": max(ys),
        "center_x": sum(xs) / len(xs),
        "center_y": sum(ys) / len(ys),
    }


def _full_text_annotation_to_line_blocks(annotation: dict) -> list[dict]:
    words = []
    for page_index, page in enumerate(annotation.get("pages") or []):
        word_index = 0
        for block in page.get("blocks") or []:
            for paragraph in block.get("paragraphs") or []:
                for word in paragraph.get("words") or []:
                    symbols = word.get("symbols") or []
                    text = "".join(str(symbol.get("text") or "") for symbol in symbols).strip()
                    if not text:
                        continue
                    box = _vertices_to_box(
                        word.get("boundingBox", {}).get("vertices") or [],
                        word_index,
                        text,
                    )
                    words.append(
                        {
                            **box,
                            "text": text,
                            "confidence": float(word.get("confidence") or paragraph.get("confidence") or 0.9),
                            "page": page_index + 1,
                        }
                    )
                    word_index += 1

    if not words:
        return []

    line_groups: list[list[dict]] = []
    for word in sorted(words, key=lambda item: (item["page"], item["center_y"], item["center_x"])):
        height = max(float(word["y_max"]) - float(word["y_min"]), 1.0)
        threshold = max(10.0, height * 0.75)
        matched = None
        for group in reversed(line_groups[-8:]):
            if group[0]["page"] != word["page"]:
                continue
            group_center = sum(float(item["center_y"]) for item in group) / len(group)
            if abs(float(word["center_y"]) - group_center) <= threshold:
                matched = group
                break
        if matched is None:
            line_groups.append([word])
        else:
            matched.append(word)

    blocks = []
    for index, group in enumerate(line_groups):
        group = sorted(group, key=lambda item: item["center_x"])
        text = " ".join(str(item["text"]).strip() for item in group if str(item["text"]).strip())
        if not text:
            continue
        xs = [item["x_min"] for item in group] + [item["x_max"] for item in group]
        ys = [item["y_min"] for item in group] + [item["y_max"] for item in group]
        blocks.append(
            {
                "text": text,
                "x_min": min(xs),
                "y_min": min(ys),
                "x_max": max(xs),
                "y_max": max(ys),
                "center_x": (min(xs) + max(xs)) / 2.0,
                "center_y": (min(ys) + max(ys)) / 2.0,
                "confidence": sum(float(item.get("confidence") or 0.9) for item in group) / len(group),
                "ocr_lang": "google_cloud_vision",
                "page": group[0].get("page", 1),
                "line_index": index,
            }
        )

    return blocks


def call_google_vision_text_detection(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
) -> dict:
    image_base64 = base64.b64encode(image_bytes).decode("ascii")
    endpoint = "https://vision.googleapis.com/v1/images:annotate"
    payload = {
        "requests": [
            {
                "image": {"content": image_base64},
                "features": [
                    {
                        "type": "DOCUMENT_TEXT_DETECTION",
                        "maxResults": GOOGLE_VISION_MAX_RESULTS,
                    }
                ],
                "imageContext": {
                    "languageHints": ["en", "zh", "es"],
                },
            }
        ]
    }

    params = {"key": GOOGLE_CLOUD_API} if GOOGLE_CLOUD_API else None
    headers = None if params else _vision_headers()
    response = requests.post(
        endpoint,
        params=params,
        headers=headers,
        json=payload,
        timeout=GOOGLE_VISION_TIMEOUT,
    )
    response.raise_for_status()
    data = response.json()
    responses = data.get("responses") or []
    if not responses:
        return {"text": "", "blocks": [], "provider": "google_cloud_vision"}
    first = responses[0]
    if first.get("error"):
        raise RuntimeError(f"Google Cloud Vision error: {first['error']}")

    annotations = first.get("textAnnotations") or []
    full_text = first.get("fullTextAnnotation", {}).get("text") or (
        annotations[0].get("description") if annotations else ""
    ) or ""

    blocks = _full_text_annotation_to_line_blocks(first.get("fullTextAnnotation") or {})

    if not blocks:
        for index, annotation in enumerate(annotations[1:] or []):
            block = _text_anchor_to_block(0, index, annotation, "google_cloud_vision")
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
                    "ocr_lang": "google_cloud_vision",
                    "page": 1,
                }
            )

    return {
        "text": full_text.strip(),
        "blocks": sorted(blocks, key=lambda item: (item.get("page", 1), item["center_y"], item["center_x"])),
        "provider": "google_cloud_vision",
    }


def extract_layout_blocks_from_image_with_google_vision(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
) -> list[dict]:
    return call_google_vision_text_detection(image_bytes, mime_type=mime_type).get("blocks") or []
