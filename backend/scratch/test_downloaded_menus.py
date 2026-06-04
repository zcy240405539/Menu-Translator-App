import os
import sys
import time
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

load_dotenv(dotenv_path=backend_dir / ".env")

from app.services.ocr_service import extract_layout_blocks_from_image

ENGLISH_DIR = r"C:\Users\zcy24\Documents\Docs\APP_Develop\English_Menu"
CHINESE_DIR = r"C:\Users\zcy24\Documents\Docs\APP_Develop\Chinese_Menu"
REPORT_PATH = os.path.join(backend_dir, "scratch", "batch_ocr_test_report.txt")

def evaluate_directory(directory: str, lang: str, label: str, report_file) -> list:
    print(f"\nEvaluating {label} Menus in: {directory}...")
    report_file.write(f"\n==========================================")
    report_file.write(f"\n EVALUATING {label.upper()} MENUS")
    report_file.write(f"\n==========================================\n")
    
    files = [f for f in os.listdir(directory) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    if not files:
        print("No image files found in this directory.")
        report_file.write("No image files found in this directory.\n")
        return []
        
    results = []
    for file_name in files:
        file_path = os.path.join(directory, file_name)
        print(f" -> Processing {file_name}...")
        report_file.write(f"\nFile: {file_name}\n")
        
        try:
            with open(file_path, "rb") as f:
                file_bytes = f.read()
                
            start_time = time.perf_counter()
            blocks = extract_layout_blocks_from_image(file_bytes, source_lang=lang)
            duration = time.perf_counter() - start_time
            
            if blocks:
                confidences = [b.get("confidence", 0) for b in blocks]
                avg_conf = sum(confidences) / len(blocks)
                text_len = sum(len(b.get("text", "")) for b in blocks)
                
                print(f"    Done: {len(blocks)} blocks, Conf: {avg_conf:.4f}, Time: {duration:.2f}s")
                report_file.write(f" - Blocks detected: {len(blocks)}\n")
                report_file.write(f" - Average confidence: {avg_conf:.4f}\n")
                report_file.write(f" - Time elapsed: {duration:.2f} seconds\n")
                report_file.write(f" - Characters length: {text_len}\n")
                report_file.write(f" - Top 10 recognized lines:\n")
                
                for idx, b in enumerate(blocks[:10]):
                    report_file.write(f"   [{idx + 1:02d}] (Conf: {b.get('confidence'):.4f}) -> {b.get('text')}\n")
                    
                report_file.write("\n - Full Extracted Text:\n")
                report_file.write("------------------------------------------\n")
                for b in blocks:
                    report_file.write(f"{b.get('text')}\n")
                report_file.write("------------------------------------------\n")
                
                results.append({
                    "file_name": file_name,
                    "blocks_count": len(blocks),
                    "avg_confidence": avg_conf,
                    "text_length": text_len,
                    "time": duration,
                    "success": True
                })
            else:
                print("    Done: No text blocks detected!")
                report_file.write(" - Status: FAILED (No text blocks detected)\n")
                results.append({
                    "file_name": file_name,
                    "blocks_count": 0,
                    "avg_confidence": 0.0,
                    "text_length": 0,
                    "time": duration,
                    "success": False
                })
        except Exception as e:
            print(f"    Error processing file: {e}")
            report_file.write(f" - Status: EXCEPTION ({e})\n")
            results.append({
                "file_name": file_name,
                "blocks_count": 0,
                "avg_confidence": 0.0,
                "text_length": 0,
                "time": 0,
                "success": False
            })
            
    return results

if __name__ == "__main__":
    print("Starting Batch Menu OCR Evaluation...")
    
    os.makedirs(os.path.dirname(REPORT_PATH), exist_ok=True)
    with open(REPORT_PATH, "w", encoding="utf-8") as rf:
        rf.write("==========================================\n")
        rf.write(" BATCH MENU OCR EVALUATION REPORT\n")
        rf.write("==========================================\n")
        
        # 1. Evaluate English Menus
        en_results = evaluate_directory(ENGLISH_DIR, "en", "English", rf)
        
        # 2. Evaluate Chinese Menus
        zh_results = evaluate_directory(CHINESE_DIR, "zh", "Chinese", rf)
        
        # 3. Overall Summary
        rf.write("\n\n==========================================\n")
        rf.write(" OVERALL SUMMARY REPORT\n")
        rf.write("==========================================\n")
        
        all_results = en_results + zh_results
        total_files = len(all_results)
        success_files = sum(1 for r in all_results if r["success"])
        
        rf.write(f"Total files evaluated: {total_files}\n")
        rf.write(f"Successfully recognized files: {success_files}\n")
        
        if success_files > 0:
            avg_all_conf = sum(r["avg_confidence"] for r in all_results if r["success"]) / success_files
            rf.write(f"Overall average confidence score: {avg_all_conf:.4f}\n")
            
        print(f"\nBatch evaluation completed! Report saved to {REPORT_PATH}")
