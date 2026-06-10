import os
import tempfile
from contextlib import suppress
from functools import lru_cache
from typing import Dict, List, Optional, Tuple

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["FLAGS_enable_mkldnn"] = "0"
os.environ["FLAGS_cpu_deterministic"] = "1"
os.environ.setdefault("DISABLE_MODEL_SOURCE_CHECK", "True")

Image.MAX_IMAGE_PIXELS = None

PaddleOCR = None
PADDLE_IMPORT_ERROR = None


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

AUTO_OCR_LANG_ORDER = [
    lang.strip()
    for lang in os.getenv("OCR_AUTO_LANG_ORDER", "en,ch").split(",")
    if lang.strip()
]
OCR_ENGINE_CACHE_SIZE = int(os.getenv("OCR_ENGINE_CACHE_SIZE", "2"))
OCR_AUTO_MODE = os.getenv("OCR_AUTO_MODE", "fast").strip().lower()
OCR_FAST_AUTO_MIN_SCORE = float(os.getenv("OCR_FAST_AUTO_MIN_SCORE", "58"))
OCR_MAX_IMAGE_WIDTH = int(os.getenv("OCR_MAX_IMAGE_WIDTH", "1600"))
OCR_MAX_IMAGE_HEIGHT = int(os.getenv("OCR_MAX_IMAGE_HEIGHT", "2400"))
OCR_SMALL_IMAGE_UPSCALE_MAX = float(os.getenv("OCR_SMALL_IMAGE_UPSCALE_MAX", "1.65"))
OCR_JPEG_QUALITY = int(os.getenv("OCR_JPEG_QUALITY", "88"))
ENABLE_TEXTLINE_ORIENTATION = os.getenv("OCR_TEXTLINE_ORIENTATION", "false").lower() in {
    "1",
    "true",
    "yes",
}


def load_paddle_ocr_class():
    global PaddleOCR, PADDLE_IMPORT_ERROR

    if PaddleOCR is not None:
        return PaddleOCR

    try:
        from paddleocr import PaddleOCR as PaddleOCRClass
    except ImportError as exc:
        PADDLE_IMPORT_ERROR = exc
        return None

    PaddleOCR = PaddleOCRClass
    return PaddleOCR


def normalize_ocr_lang(source_lang: Optional[str]) -> str:
    if not source_lang:
        return "auto"

    key = source_lang.strip().lower()
    return SUPPORTED_OCR_LANGS.get(key, "auto")


@lru_cache(maxsize=OCR_ENGINE_CACHE_SIZE)
def get_ocr_engine(lang: str = "ch"):
    paddle_ocr_class = load_paddle_ocr_class()
    if paddle_ocr_class is None:
        if PADDLE_IMPORT_ERROR:
            print(f"PaddleOCR import failed: {PADDLE_IMPORT_ERROR}")
        return None

    # PaddleOCR 3.x removed several 2.x constructor flags. Prefer the new
    # pipeline arguments, then fall back to the older API for existing setups.
    try:
        return paddle_ocr_class(
            lang=lang,
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=ENABLE_TEXTLINE_ORIENTATION,
            text_det_limit_side_len=int(os.getenv("OCR_DET_LIMIT_SIDE_LEN", str(OCR_MAX_IMAGE_WIDTH))),
            text_det_limit_type="max",
            text_rec_score_thresh=0.2,
        )
    except (TypeError, ValueError):
        return paddle_ocr_class(
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

    max_width = OCR_MAX_IMAGE_WIDTH
    max_height = OCR_MAX_IMAGE_HEIGHT
    w, h = image.size

    upscale_ratio = 1
    if max(w, h) < 1400:
        upscale_ratio = min(OCR_SMALL_IMAGE_UPSCALE_MAX, max_width / w, max_height / h)

    ratio = min(max_width / w, max_height / h, upscale_ratio)

    if ratio != 1:
        image = image.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)

    image = ImageOps.autocontrast(image, cutoff=1)
    image = ImageEnhance.Contrast(image).enhance(1.25)
    image = ImageEnhance.Sharpness(image).enhance(1.15)
    image = image.filter(ImageFilter.UnsharpMask(radius=1.0, percent=110, threshold=3))

    processed_path = original_path.replace(".jpg", "_processed.jpg")
    image.save(processed_path, "JPEG", quality=OCR_JPEG_QUALITY, optimize=True)

    return processed_path


def cleanup_preprocessed_image(processed_path: str) -> None:
    paths = [processed_path]
    if processed_path.endswith("_processed.jpg"):
        paths.append(processed_path.replace("_processed.jpg", ".jpg"))

    for path in paths:
        with suppress(Exception):
            os.remove(path)


def _run_paddle_ocr(image_path: str, lang: str) -> List[dict]:
    engine = get_ocr_engine(lang)
    if engine is None:
        return []

    if hasattr(engine, "predict"):
        result = engine.predict(image_path)
    else:
        result = engine.ocr(image_path, cls=True)

    blocks = []

    def add_block(text, confidence, box):
        if not text or float(confidence or 0) < 0.2 or not box:
            return

        points = [[float(p[0]), float(p[1])] for p in box]
        xs = [p[0] for p in points]
        ys = [p[1] for p in points]

        blocks.append({
            "text": str(text).strip(),
            "x_min": min(xs),
            "y_min": min(ys),
            "x_max": max(xs),
            "y_max": max(ys),
            "center_x": sum(xs) / len(xs),
            "center_y": sum(ys) / len(ys),
            "confidence": round(float(confidence or 0), 4),
            "ocr_lang": lang,
        })

    def parse_page(page):
        if not page:
            return

        if hasattr(page, "json"):
            try:
                page = page.json
            except Exception:
                pass

        if isinstance(page, dict):
            if isinstance(page.get("res"), dict):
                page = page["res"]

            texts = page.get("rec_texts") or page.get("texts") or []
            scores = page.get("rec_scores") or page.get("scores") or []
            boxes = (
                page.get("rec_polys")
                or page.get("dt_polys")
                or page.get("text_det_polys")
                or page.get("boxes")
                or []
            )

            for text, score, box in zip(texts, scores, boxes):
                add_block(text, score, box)
            return

        # PaddleOCR 2.x shape: [[box, (text, score)], ...]
        for item in page:
            if not item or len(item) < 2:
                continue

            box = item[0]
            text_info = item[1]
            if not isinstance(text_info, (list, tuple)) or len(text_info) < 2:
                continue

            add_block(text_info[0], text_info[1], box)

    for page in result or []:
        parse_page(page)

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
    try:
        lang = normalize_ocr_lang(source_lang)

        if lang != "auto":
            return _run_paddle_ocr(image_path, lang)

        candidates = []
        for index, candidate_lang in enumerate(AUTO_OCR_LANG_ORDER):
            try:
                blocks = _run_paddle_ocr(image_path, candidate_lang)
                score = _score_blocks(blocks)
                candidates.append((candidate_lang, blocks, score))

                if (
                    OCR_AUTO_MODE == "fast"
                    and index == 0
                    and score >= OCR_FAST_AUTO_MIN_SCORE
                ):
                    print(
                        f"Fast auto OCR accepted lang={candidate_lang}, "
                        f"score={score:.2f}, blocks={len(blocks)}"
                    )
                    return blocks
            except Exception as e:
                print(f"OCR failed for lang={candidate_lang}: {e}")

        if not candidates:
            return []

        best_lang, best_blocks, best_score = max(candidates, key=lambda x: x[2])
        print(f"Auto OCR selected lang={best_lang}, score={best_score:.2f}, blocks={len(best_blocks)}")

        return best_blocks
    finally:
        cleanup_preprocessed_image(image_path)


def extract_text_from_image(
    file_bytes: bytes,
    source_lang: str = "auto",
) -> str:
    blocks = extract_layout_blocks_from_image(file_bytes, source_lang=source_lang)
    return "\n".join(b["text"] for b in blocks if b.get("text"))
