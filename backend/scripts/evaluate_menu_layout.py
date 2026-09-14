"""Reparse a saved API response's OCR blocks with the image-layout route."""
import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.services.gemini_menu_service import call_gemini_for_menu_layout
from app.services.openrouter_service import call_openrouter_for_menu_layout
from app.services.menu_layout_service import parse_menu_layout_pages

parser = argparse.ArgumentParser()
parser.add_argument("baseline", type=Path)
parser.add_argument("output", type=Path)
parser.add_argument("--provider", choices=["gemini", "openrouter"], default="gemini")
args = parser.parse_args()
baseline = json.loads(args.baseline.read_text(encoding="utf-8"))["result"]
started = time.perf_counter()
result = parse_menu_layout_pages(
    baseline["ocr_blocks"],
    lambda blocks: (call_gemini_for_menu_layout if args.provider == "gemini" else call_openrouter_for_menu_layout)(
        blocks, target_lang="zh-cn", source_lang="en"),
)
result["evaluation_seconds"] = round(time.perf_counter() - started, 2)
args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({"items": len(result["menu_items"]), "seconds": result["evaluation_seconds"]}))
