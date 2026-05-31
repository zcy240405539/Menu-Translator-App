import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path so we can import from app
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

load_dotenv(dotenv_path=backend_dir / ".env")

from app.ocr_service import extract_layout_blocks_from_image

ENGLISH_MENU_PATH = r"C:\Users\zcy24\Documents\Docs\APP_Develop\English_Menu\Sample_menu_eng.jpg"
CHINESE_MENU_PATH = r"C:\Users\zcy24\Documents\Docs\APP_Develop\Chinese_Menu\Sample_Menu_3.jpg"

def run_ocr_test(file_path: str, lang: str):
    print(f"\n==========================================")
    print(f"Testing File: {file_path}")
    print(f"Requested Language: {lang}")
    print(f"==========================================")
    
    if not os.path.exists(file_path):
        print(f"ERROR: File does not exist at {file_path}")
        return
        
    try:
        with open(file_path, "rb") as f:
            file_bytes = f.read()
            
        print("Running OCR extraction...")
        blocks = extract_layout_blocks_from_image(file_bytes, source_lang=lang)
        
        print(f"\nResults:")
        print(f" - Total text blocks detected: {len(blocks)}")
        if blocks:
            confidences = [b.get("confidence", 0) for b in blocks]
            avg_conf = sum(confidences) / len(blocks)
            print(f" - Average confidence score: {avg_conf:.4f}")
            print(f" - Max confidence score: {max(confidences):.4f}")
            print(f" - Min confidence score: {min(confidences):.4f}")
            
            print("\nFirst 15 blocks detected:")
            for idx, b in enumerate(blocks[:15]):
                print(f"   [{idx + 1:02d}] (Conf: {b.get('confidence'):.4f}) -> {b.get('text')}")
                
            print("\nFull parsed text block by block:")
            print("------------------------------------------")
            for idx, b in enumerate(blocks):
                print(b.get("text"))
            print("------------------------------------------")
        else:
            print(" - No text blocks detected!")
            
    except Exception as e:
        print("OCR execution failed:", e)

if __name__ == "__main__":
    print("Starting Menu OCR Test on local files...")
    
    # 1. Test English Menu
    run_ocr_test(ENGLISH_MENU_PATH, "en")
    
    # 2. Test Chinese Menu
    run_ocr_test(CHINESE_MENU_PATH, "zh")
