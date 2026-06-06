import os
import sys
import json
import time
from pathlib import Path
from dotenv import load_dotenv

# Set up path to import app services
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

# Load .env file
dotenv_path = backend_dir / ".env"
load_dotenv(dotenv_path)

from app.services.ocr_service import extract_layout_blocks_from_image
from app.services.openrouter_service import (
    call_openrouter_vision_for_menu,
    call_openrouter_for_menu_layout,
    _call_openrouter_for_menu_layout_fast
)
from app.main import vision_layout_to_ocr_blocks

INPUT_DIR = Path(r"C:\Users\zcy24\Documents\Docs\APP_Develop\Chinese_Menu")
RESULT_DIR = backend_dir / "scratch"

def test_parse_menu(image_filename, target_lang="en", source_lang="zh"):
    image_path = INPUT_DIR / image_filename
    if not image_path.exists():
        print(f"File not found: {image_path}")
        return
    
    print(f"\n==========================================")
    print(f"Testing menu parsing for: {image_filename}")
    print(f"Target Lang: {target_lang}, Source Lang: {source_lang}")
    print(f"==========================================")
    
    file_bytes = image_path.read_bytes()
    ocr_provider = os.getenv("OCR_PROVIDER", "vision").strip().lower()
    print(f"Using OCR Provider: {ocr_provider}")
    
    start_time = time.perf_counter()
    ocr_blocks = []
    result = {}
    
    try:
        if ocr_provider in {"vision", "openrouter", "cloud"}:
            print("Running Vision-based OCR & parsing...")
            vision_result = call_openrouter_vision_for_menu(
                image_bytes=file_bytes,
                mime_type="image/jpeg",
                target_lang=target_lang,
                source_lang=source_lang,
            )
            print("Vision raw lines extracted:", len(vision_result.get("ocr_lines", [])))
            print("First 30 raw OCR lines:")
            for line in vision_result.get("ocr_lines", [])[:30]:
                print(f"  - {line}")
            
            # Save raw vision result for analysis
            raw_vision_path = RESULT_DIR / f"raw_vision_{image_path.stem}.json"
            raw_vision_path.write_text(json.dumps(vision_result, indent=2, ensure_ascii=False), encoding="utf-8")
            print(f"Saved raw vision result to: {raw_vision_path}")
            
            ocr_blocks = vision_layout_to_ocr_blocks(vision_result)
            print("Vision blocks created:", len(ocr_blocks))
            
            # Reconstruct layout using layout parser
            result = _call_openrouter_for_menu_layout_fast(
                ocr_blocks=ocr_blocks,
                target_lang=target_lang,
                source_lang=source_lang,
            )
        else:
            print("Running Local PaddleOCR...")
            ocr_blocks = extract_layout_blocks_from_image(file_bytes, source_lang=source_lang)
            print("Local OCR blocks extracted:", len(ocr_blocks))
            result = _call_openrouter_for_menu_layout_fast(
                ocr_blocks=ocr_blocks,
                target_lang=target_lang,
                source_lang=source_lang,
            )
            
        duration = round(time.perf_counter() - start_time, 2)
        print(f"Parsing finished in {duration} seconds.")
        
        # Save output JSON
        output_filename = f"test_result_{image_path.stem}.json"
        output_path = RESULT_DIR / output_filename
        output_path.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"Saved parsed result to: {output_path}")
        
        # Print stats
        menu_items = result.get("menu_items", [])
        print(f"Parsed {len(menu_items)} menu items.")
        
        # Verify number prefixes preservation
        numbered_items = 0
        bilingual_names_reused = 0
        for item in menu_items[:10]: # Check first 10 items
            orig = item.get("original_name", "")
            trans = item.get("translated_name", "")
            print(f"  - Original: '{orig}' | Translated: '{trans}' | Price: '{item.get('price')}'")
            
            # Check for numbers/codes
            if any(char.isdigit() for char in orig.split('.')[0] if char.isalnum()):
                numbered_items += 1
                
        print(f"Verification Summary:")
        print(f"  - Sample checked items: {min(10, len(menu_items))}")
        print(f"  - Number of items with detected number/code prefix: {numbered_items}")
        
    except Exception as e:
        import traceback
        print(f"Error parsing menu: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    # Test with Taipei_Station.jpg or Sample_Menu_3.jpg if they exist
    test_files = ["Taipei_Station.jpg", "Sample_Menu_3.jpg", "chinese_menu_unsplash_01.jpg"]
    
    # Check what files are available
    available = [f for f in test_files if (INPUT_DIR / f).exists()]
    if not available:
        print(f"No test files found in {INPUT_DIR}. Run download_bilingual_menus.py first.")
    else:
        for file in available[:2]: # run first 2 files
            test_parse_menu(file, target_lang="en", source_lang="zh")
