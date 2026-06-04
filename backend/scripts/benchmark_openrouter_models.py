import argparse
import json
import sys
import time
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.services import openrouter_service
from app.services.ocr_service import extract_layout_blocks_from_image


FREE_MODELS = [
    "deepseek/deepseek-v4-flash:free",
    "qwen/qwen3-coder:free",
    "openai/gpt-oss-20b:free",
]

CHEAP_MODELS = [
    "google/gemini-2.5-flash-lite",
    "google/gemini-2.0-flash-001",
    "openai/gpt-4.1-nano",
]


def has_cjk(value) -> bool:
    return any("\u4e00" <= ch <= "\u9fff" for ch in str(value or ""))


def has_latin(value) -> bool:
    return any(("a" <= ch.lower() <= "z") for ch in str(value or ""))


def summarize_result(result: dict) -> dict:
    items = result.get("menu_items") or []
    english_only_descriptions = [
        item
        for item in items
        if has_latin(item.get("description")) and not has_cjk(item.get("description"))
    ]
    missing_translations = [
        item for item in items if not has_cjk(item.get("translated_name"))
    ]

    return {
        "item_count": len(items),
        "english_only_description_count": len(english_only_descriptions),
        "missing_chinese_name_count": len(missing_translations),
        "business_name": result.get("business_name"),
        "sample_items": [
            {
                "original_name": item.get("original_name"),
                "translated_name": item.get("translated_name"),
                "price": item.get("price"),
                "section": item.get("section_heading_translated"),
            }
            for item in items[:5]
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Benchmark OpenRouter menu analysis models against one local menu image."
    )
    parser.add_argument("file", help="Path to a menu image")
    parser.add_argument("--source-lang", default="en")
    parser.add_argument("--target-lang", default="zh")
    parser.add_argument(
        "--models",
        nargs="*",
        default=FREE_MODELS + CHEAP_MODELS,
        help="OpenRouter model IDs to test",
    )
    args = parser.parse_args()

    file_path = Path(args.file)
    file_bytes = file_path.read_bytes()

    ocr_started = time.perf_counter()
    ocr_blocks = extract_layout_blocks_from_image(file_bytes, source_lang=args.source_lang)
    ocr_seconds = time.perf_counter() - ocr_started

    print(
        json.dumps(
            {
                "file": str(file_path),
                "ocr_blocks": len(ocr_blocks),
                "ocr_seconds": round(ocr_seconds, 3),
                "models": args.models,
            },
            ensure_ascii=False,
        ),
        flush=True,
    )

    for model in args.models:
        started = time.perf_counter()
        row = {"model": model}
        try:
            result = openrouter_service.call_openrouter_for_menu_layout(
                ocr_blocks=ocr_blocks,
                target_lang=args.target_lang,
                source_lang=args.source_lang,
                model=model,
            )
            row.update(summarize_result(result))
            row["status"] = "ok"
        except Exception as exc:
            row["status"] = "error"
            row["error"] = str(exc)[:500]

        row["analysis_seconds"] = round(time.perf_counter() - started, 3)
        print(json.dumps(row, ensure_ascii=False), flush=True)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
