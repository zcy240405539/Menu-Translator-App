import os
import tempfile
from functools import lru_cache
from typing import Dict, List, Optional, Tuple

from PIL import Image, ImageEnhance, ImageFilter

os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["FLAGS_enable_mkldnn"] = "0"
os.environ["FLAGS_cpu_deterministic"] = "1"

Image.MAX_IMAGE_PIXELS = None

try:
    from paddleocr import PaddleOCR
except ImportError:
    PaddleOCR = None


SUPPORTED_OCR_LANGS = {
    "auto": "auto",
    "zh": "ch",
    "ch": "ch",
    "zh-cn": "ch",
    "en": "en",
    "fr": "fr",
    "de": "german",
    "german": "german",
    "ja": "japan",
    "jp": "japan",
    "japan": "japan",
    "ko": "korean",
    "kr": "korean",
    "korean": "korean",
}

AUTO_OCR_LANG_ORDER = ["en", "ch", "fr", "german", "japan", "korean"]


def normalize_ocr_lang(source_lang: Optional[str]) -> str:
    if not source_lang:
        return "auto"

    key = source_lang.strip().lower()
    return SUPPORTED_OCR_LANGS.get(key, "auto")


@lru_cache(maxsize=8)
def get_ocr_engine(lang: str = "ch"):
    if PaddleOCR is None:
        return None

    return PaddleOCR(
        use_angle_cls=True,
        lang=lang,
        use_gpu=False,
        enable_mkldnn=False,
        show_log=False,
    )


def save_preprocessed_image(file_bytes: bytes) -> str:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        original_path = tmp.name
        tmp.write(file_bytes)

    image = Image.open(original_path).convert("RGB")

    max_width = 1800
    max_height = 2600
    w, h = image.size
    ratio = min(max_width / w, max_height / h, 1)

    if ratio < 1:
        image = image.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)

    image = ImageEnhance.Contrast(image).enhance(1.25)
    image = ImageEnhance.Sharpness(image).enhance(1.15)
    image = image.filter(ImageFilter.SHARPEN)

    processed_path = original_path.replace(".jpg", "_processed.jpg")
    image.save(processed_path, "JPEG", quality=92)

    return processed_path


def _run_paddle_ocr(image_path: str, lang: str) -> List[dict]:
    engine = get_ocr_engine(lang)
    if engine is None:
        return []

    result = engine.ocr(image_path, cls=True)
    blocks = []

    for page in result or []:
        if not page:
            continue

        for item in page:
            box = item[0]
            text = item[1][0]
            confidence = float(item[1][1])

            if not text or confidence < 0.25:
                continue

            xs = [p[0] for p in box]
            ys = [p[1] for p in box]

            blocks.append({
                "text": text.strip(),
                "x_min": min(xs),
                "y_min": min(ys),
                "x_max": max(xs),
                "y_max": max(ys),
                "center_x": sum(xs) / len(xs),
                "center_y": sum(ys) / len(ys),
                "confidence": round(confidence, 4),
                "ocr_lang": lang,
            })

    return sorted(blocks, key=lambda b: (b["center_y"], b["center_x"]))


def _score_blocks(blocks: List[dict]) -> float:
    if not blocks:
        return 0.0

    text_len = sum(len(b.get("text", "")) for b in blocks)
    avg_conf = sum(float(b.get("confidence", 0)) for b in blocks) / len(blocks)

    return avg_conf * 100 + min(text_len, 1200) * 0.03 + min(len(blocks), 80) * 0.5


def extract_layout_blocks_from_image(
    file_bytes: bytes,
    source_lang: str = "auto",
) -> List[dict]:
    image_path = save_preprocessed_image(file_bytes)
    lang = normalize_ocr_lang(source_lang)

    if lang != "auto":
        return _run_paddle_ocr(image_path, lang)

    candidates = []
    for candidate_lang in AUTO_OCR_LANG_ORDER:
        try:
            blocks = _run_paddle_ocr(image_path, candidate_lang)
            candidates.append((candidate_lang, blocks, _score_blocks(blocks)))
        except Exception as e:
            print(f"OCR failed for lang={candidate_lang}: {e}")

    if not candidates:
        return []

    best_lang, best_blocks, best_score = max(candidates, key=lambda x: x[2])
    print(f"Auto OCR selected lang={best_lang}, score={best_score:.2f}, blocks={len(best_blocks)}")

    return best_blocks


def extract_text_from_image(
    file_bytes: bytes,
    source_lang: str = "auto",
) -> str:
    blocks = extract_layout_blocks_from_image(file_bytes, source_lang=source_lang)
    return "\n".join(b["text"] for b in blocks if b.get("text"))