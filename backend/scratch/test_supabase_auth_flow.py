import os
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

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

test_email = "antigravity_temp_test@example.com"
test_password = "SuperSecretPassword123!"

try:
    print("Attempting to delete user if already exists...")
    users = supabase.auth.admin.list_users()
    for u in users:
        if u.email == test_email:
            print(f"Found existing test user {u.id}, deleting...")
            supabase.auth.admin.delete_user(u.id)
except Exception as e:
    print("Delete check error (safe to ignore if first run):", e)

try:
    print("\n1. Testing admin.create_user (instant confirmation)...")
    user_res = supabase.auth.admin.create_user({
        "email": test_email,
        "password": test_password,
        "email_confirm": True,
        "user_metadata": {
            "username": "temp_test_user",
            "phone": "+1234567890"
        }
    })
    print("Created User ID:", user_res.user.id)
    print("Created User Email:", user_res.user.email)
    print("User metadata:", user_res.user.user_metadata)
    
    print("\n2. Testing sign_in_with_password...")
    session_res = supabase.auth.sign_in_with_password({
        "email": test_email,
        "password": test_password
    })
    print("Session access token:", session_res.session.access_token[:15] + "...")
    print("Session user ID:", session_res.user.id)
    
    print("\n3. Testing get_user with access token...")
    # Verify user token
    user_verify = supabase.auth.get_user(session_res.session.access_token)
    print("Verified User ID:", user_verify.user.id)
    
    print("\n4. Testing admin.delete_user to clean up...")
    supabase.auth.admin.delete_user(user_res.user.id)
    print("Cleanup successful.")
    
except Exception as e:
    print("Error during auth flow testing:", e)
