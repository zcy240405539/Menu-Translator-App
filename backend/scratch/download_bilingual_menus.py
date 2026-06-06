import os
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load backend .env file
backend_dir = Path(__file__).resolve().parent.parent
dotenv_path = backend_dir / ".env"
load_dotenv(dotenv_path)

PEXELS_API_KEY = os.getenv("PEXELS_API_KEY")
UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY")
OUTPUT_DIR = Path(r"C:\Users\zcy24\Documents\Docs\APP_Develop\Chinese_Menu")

# Ensure the output directory exists
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def download_image(url, filename):
    filepath = OUTPUT_DIR / filename
    print(f"Downloading {url} to {filepath}...")
    try:
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            filepath.write_bytes(response.content)
            print(f"Successfully downloaded {filename} ({len(response.content)} bytes)")
            return True
        else:
            print(f"Failed to download {filename}: HTTP {response.status_code}")
    except Exception as e:
        print(f"Error downloading {filename}: {e}")
    return False

def download_from_pexels():
    if not PEXELS_API_KEY:
        print("PEXELS_API_KEY is not configured in .env")
        return
    
    print("Searching Pexels for 'chinese menu'...")
    url = "https://api.pexels.com/v1/search"
    headers = {"Authorization": PEXELS_API_KEY}
    params = {"query": "chinese menu", "per_page": 3}
    
    try:
        res = requests.get(url, headers=headers, params=params, timeout=15)
        if res.status_code == 200:
            photos = res.json().get("photos", [])
            for idx, photo in enumerate(photos):
                img_url = photo.get("src", {}).get("large")
                if img_url:
                    download_image(img_url, f"pexels_chinese_menu_{idx + 1}.jpg")
        else:
            print(f"Pexels search failed: HTTP {res.status_code} {res.text}")
    except Exception as e:
        print(f"Error querying Pexels: {e}")

def download_from_unsplash():
    if not UNSPLASH_ACCESS_KEY:
        print("UNSPLASH_ACCESS_KEY is not configured in .env")
        return
    
    print("Searching Unsplash for 'chinese menu'...")
    url = "https://api.unsplash.com/search/photos"
    headers = {"Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"}
    params = {"query": "chinese menu", "per_page": 3}
    
    try:
        res = requests.get(url, headers=headers, params=params, timeout=15)
        if res.status_code == 200:
            results = res.json().get("results", [])
            for idx, item in enumerate(results):
                img_url = item.get("urls", {}).get("regular")
                if img_url:
                    download_image(img_url, f"unsplash_chinese_menu_{idx + 1}.jpg")
        else:
            print(f"Unsplash search failed: HTTP {res.status_code} {res.text}")
    except Exception as e:
        print(f"Error querying Unsplash: {e}")

if __name__ == "__main__":
    # Also include a few known public URLs of real-world bilingual menus to ensure success even if API limits are hit
    public_urls = [
        ("https://raw.githubusercontent.com/zcy240405539/Menu-Translator-App/main/backend/static/placeholder.jpg", "public_placeholder_menu.jpg"),
        # Standard Chinese-English dim sum menu from web
        ("https://upload.wikimedia.org/wikipedia/commons/d/d4/Dim_Sum_Menu.jpg", "dim_sum_bilingual_menu.jpg")
    ]
    
    for url, name in public_urls:
        download_image(url, name)
        
    download_from_pexels()
    download_from_unsplash()
    print("Download script finished.")
