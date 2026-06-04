import os
import sys
from dotenv import load_dotenv

# Load env from current directory or parent directory
if os.path.exists(".env"):
    load_dotenv(dotenv_path=".env")
elif os.path.exists("backend/.env"):
    load_dotenv(dotenv_path="backend/.env")
else:
    load_dotenv()

from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

print(f"URL: {SUPABASE_URL}")
print(f"KEY: {SUPABASE_SERVICE_ROLE_KEY[:10] if SUPABASE_SERVICE_ROLE_KEY else None}...")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

try:
    print("Available methods on supabase.auth:")
    print([x for x in dir(supabase.auth) if not x.startswith("_")])
    print("\nAvailable methods on supabase.auth.admin:")
    print([x for x in dir(supabase.auth.admin) if not x.startswith("_")])
except Exception as e:
    print("Error inspecting supabase.auth:", e)
