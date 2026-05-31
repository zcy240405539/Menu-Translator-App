import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path so we can import from app
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

load_dotenv(dotenv_path=backend_dir / ".env")

print("--- Environment Variables Loaded ---")
print("DATABASE_URL:", os.getenv("DATABASE_URL")[:30] + "..." if os.getenv("DATABASE_URL") else "None")
print("SUPABASE_URL:", os.getenv("SUPABASE_URL"))
print("SUPABASE_BUCKET:", os.getenv("SUPABASE_BUCKET"))
print("OPENROUTER_MODEL:", os.getenv("OPENROUTER_MODEL"))

# 1. Test SQLAlchemy Database Connection
print("\n--- Testing PostgreSQL Connection via SQLAlchemy ---")
try:
    from sqlalchemy import create_engine, text
    DATABASE_URL = os.getenv("DATABASE_URL")
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1")).fetchone()
        print("SQLAlchemy connection successful! Result of 'SELECT 1':", result)
        
        # Count dish caches
        try:
            cache_count = conn.execute(text("SELECT COUNT(*) FROM dish_cache")).fetchone()[0]
            print(f"Connection OK! Existing rows in dish_cache: {cache_count}")
        except Exception as table_err:
            print("Table query failed (tables might not exist yet):", table_err)
except Exception as e:
    print("Database connection FAILED:", e)

# 2. Test Supabase Client & Storage Connection
print("\n--- Testing Supabase Storage Client ---")
try:
    from supabase import create_client
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "Dish_Images")
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env!")
    else:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        print("Supabase client initialized successfully!")
        
        # Test listing files from the bucket
        try:
            res = supabase.storage.from_(SUPABASE_BUCKET).list()
            print(f"Successfully listed files from bucket '{SUPABASE_BUCKET}':")
            if res:
                print(f"List returned {len(res)} items. First 3 items:")
                for item in res[:3]:
                    if hasattr(item, 'name'):
                        print(f" - Object Name: {item.name}")
                    elif isinstance(item, dict):
                        print(f" - Dict Name: {item.get('name')}")
                    else:
                        print(f" - Item Repr: {repr(item)}")
            else:
                print(" Bucket is empty or list returned no items.")
        except Exception as bucket_err:
            print(f"Bucket list operation on '{SUPABASE_BUCKET}' FAILED:", bucket_err)
except Exception as e:
    print("Supabase client check FAILED:", e)

# 3. Test OpenRouter Connection
print("\n--- Testing OpenRouter API Connectivity ---")
try:
    import requests
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
    OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash-lite")
    
    if not OPENROUTER_API_KEY:
        print("Missing OPENROUTER_API_KEY in .env!")
    else:
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json"
        }
        data = {
            "model": OPENROUTER_MODEL,
            "messages": [
                {"role": "user", "content": "Say 'hello connection test'"}
            ],
            "max_tokens": 10
        }
        res = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=data,
            timeout=15
        )
        if res.ok:
            chat_res = res.json()
            reply = chat_res["choices"][0]["message"]["content"].strip()
            print("OpenRouter API connection successful!")
            print(f"Response: '{reply}'")
        else:
            print(f"OpenRouter API call FAILED: {res.status_code} - {res.text}")
except Exception as e:
    print("OpenRouter connectivity check FAILED:", e)
