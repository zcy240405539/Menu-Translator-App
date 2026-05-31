import os
import sys
import requests
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

load_dotenv(dotenv_path=backend_dir / ".env")

PEXELS_API_KEY = os.getenv("PEXELS_API_KEY")
UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY")

ENGLISH_DIR = r"C:\Users\zcy24\Documents\Docs\APP_Develop\English_Menu"
CHINESE_DIR = r"C:\Users\zcy24\Documents\Docs\APP_Develop\Chinese_Menu"

os.makedirs(ENGLISH_DIR, exist_ok=True)
os.makedirs(CHINESE_DIR, exist_ok=True)

print("--- Menu Downloader Initialized ---")
print(f"English Directory: {ENGLISH_DIR}")
print(f"Chinese Directory: {CHINESE_DIR}")

# Fallback high-quality menu URLs (in case APIs are limited or keys are invalid)
FALLBACK_CHINESE_URLS = [
    # A beautiful bilingual Chinese/English lunch menu
    "https://upload.wikimedia.org/wikipedia/commons/e/ec/Special_Lunch_Menu_at_New_China_Lounge.jpg",
    # A clear Chinese menu board
    "https://upload.wikimedia.org/wikipedia/commons/e/e0/Chinese_menu_in_Hong_Kong_style_restaurant.jpg"
]

FALLBACK_ENGLISH_URLS = [
    # A elegant English restaurant dinner menu card
    "https://upload.wikimedia.org/wikipedia/commons/6/6b/Menu_at_L%27Espadon%2C_Ritz_Paris.jpg",
    # Hotel restaurant menu card
    "https://upload.wikimedia.org/wikipedia/commons/b/b3/Hotel_San_Claudio_menu.jpg"
]

def download_image(url: str, save_path: str) -> bool:
    try:
        print(f"Downloading from: {url}")
        res = requests.get(url, timeout=30)
        if res.ok:
            with open(save_path, "wb") as f:
                f.write(res.content)
            print(f" Successfully saved to: {save_path} ({len(res.content)} bytes)")
            return True
        else:
            print(f" Failed to download: HTTP {res.status_code}")
            return False
    except Exception as e:
        print(f" Download exception: {e}")
        return False

def search_and_download_unsplash(query: str, count: int, save_dir: str, prefix: str):
    if not UNSPLASH_ACCESS_KEY:
        print("Unsplash Access Key not available, skipping Unsplash search.")
        return False
        
    print(f"Searching Unsplash for: '{query}'...")
    try:
        res = requests.get(
            "https://api.unsplash.com/search/photos",
            headers={"Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"},
            params={"query": query, "per_page": count, "orientation": "portrait"},
            timeout=20
        )
        if res.ok:
            data = res.json()
            results = data.get("results") or []
            print(f"Found {len(results)} Unsplash results.")
            success_count = 0
            for idx, photo in enumerate(results):
                urls = photo.get("urls") or {}
                img_url = urls.get("regular") or urls.get("full")
                if img_url:
                    filename = f"{prefix}_unsplash_{idx + 1:02d}.jpg"
                    save_path = os.path.join(save_dir, filename)
                    if download_image(img_url, save_path):
                        success_count += 1
            return success_count > 0
        else:
            print(f"Unsplash search failed: HTTP {res.status_code} - {res.text[:200]}")
            return False
    except Exception as e:
        print(f"Unsplash search exception: {e}")
        return False

def search_and_download_pexels(query: str, count: int, save_dir: str, prefix: str):
    if not PEXELS_API_KEY:
        print("Pexels API Key not available, skipping Pexels search.")
        return False
        
    print(f"Searching Pexels for: '{query}'...")
    try:
        res = requests.get(
            "https://api.pexels.com/v1/search",
            headers={"Authorization": PEXELS_API_KEY},
            params={"query": query, "per_page": count, "orientation": "portrait"},
            timeout=20
        )
        if res.ok:
            data = res.json()
            photos = data.get("photos") or []
            print(f"Found {len(photos)} Pexels results.")
            success_count = 0
            for idx, photo in enumerate(photos):
                src = photo.get("src") or {}
                img_url = src.get("large") or src.get("original")
                if img_url:
                    filename = f"{prefix}_pexels_{idx + 1:02d}.jpg"
                    save_path = os.path.join(save_dir, filename)
                    if download_image(img_url, save_path):
                        success_count += 1
            return success_count > 0
        else:
            print(f"Pexels search failed: HTTP {res.status_code} - {res.text[:200]}")
            return False
    except Exception as e:
        print(f"Pexels search exception: {e}")
        return False

if __name__ == "__main__":
    # Test Unsplash first, then Pexels, then fall back to Wikimedia URLs
    
    # 1. Chinese Menus
    print("\n--- Gathering Chinese Menus ---")
    zh_downloaded = False
    
    # Try APIs first
    if UNSPLASH_ACCESS_KEY:
        zh_downloaded = search_and_download_unsplash("chinese menu text", 2, CHINESE_DIR, "chinese_menu")
    if not zh_downloaded and PEXELS_API_KEY:
        zh_downloaded = search_and_download_pexels("chinese restaurant menu", 2, CHINESE_DIR, "chinese_menu")
        
    # If APIs fail or are empty, download high-quality fallbacks
    if not zh_downloaded:
        print("API download returned no files or skipped. Running high-quality Wikimedia fallback download...")
        for idx, url in enumerate(FALLBACK_CHINESE_URLS):
            save_path = os.path.join(CHINESE_DIR, f"chinese_menu_fallback_{idx + 1:02d}.jpg")
            download_image(url, save_path)
            
    # 2. English Menus
    print("\n--- Gathering English Menus ---")
    en_downloaded = False
    
    # Try APIs first
    if UNSPLASH_ACCESS_KEY:
        en_downloaded = search_and_download_unsplash("restaurant menu text", 2, ENGLISH_DIR, "english_menu")
    if not en_downloaded and PEXELS_API_KEY:
        en_downloaded = search_and_download_pexels("dinner menu board", 2, ENGLISH_DIR, "english_menu")
        
    # If APIs fail or are empty, download high-quality fallbacks
    if not en_downloaded:
        print("API download returned no files or skipped. Running high-quality Wikimedia fallback download...")
        for idx, url in enumerate(FALLBACK_ENGLISH_URLS):
            save_path = os.path.join(ENGLISH_DIR, f"english_menu_fallback_{idx + 1:02d}.jpg")
            download_image(url, save_path)
            
    print("\n--- Menu download process completed ---")
