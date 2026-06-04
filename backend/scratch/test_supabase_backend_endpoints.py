import requests
import uuid

BASE_URL = "http://127.0.0.1:8000"

test_email = f"test_supabase_user_{uuid.uuid4().hex[:6]}@example.com"
test_username = f"user_{uuid.uuid4().hex[:6]}"
test_password = "MySecurePassword123!"

print(f"Testing registration for username={test_username}, email={test_email}...")
try:
    reg_res = requests.post(f"{BASE_URL}/auth/register", json={
        "username": test_username,
        "email": test_email,
        "password": test_password,
        "phone": "+15550199",
        "diets": ["Vegetarian"],
        "allergies": ["peanut", "seafood"],
        "budget": "$30",
        "taste": "Mild",
        "preferred_language": "zh"
    })
    
    print("Registration Status:", reg_res.status_code)
    reg_data = reg_res.json()
    print("Registration Response:", reg_data)
    
    if reg_res.status_code == 200:
        token = reg_data["token"]
        print("\nTesting /auth/me with Bearer token...")
        me_res = requests.get(f"{BASE_URL}/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        print("Me Status:", me_res.status_code)
        print("Me Response:", me_res.json())
        
        print("\nTesting profile update...")
        prof_res = requests.post(f"{BASE_URL}/auth/profile", json={
            "phone": "+15559999",
            "diets": ["Keto", "Vegetarian"],
            "allergies": ["peanut"],
            "budget": "$100",
            "taste": "Spicy",
            "preferred_language": "zh-Hant"
        }, headers={
            "Authorization": f"Bearer {token}"
        })
        print("Profile Update Status:", prof_res.status_code)
        print("Profile Update Response:", prof_res.json())

        print("\nTesting login...")
        login_res = requests.post(f"{BASE_URL}/auth/login", json={
            "email": test_email,
            "password": test_password
        })
        print("Login Status:", login_res.status_code)
        print("Login Response:", login_res.json())
        
    else:
        print("Registration failed, cannot run further tests.")
        
except Exception as e:
    print("Connection or parsing error:", e)
