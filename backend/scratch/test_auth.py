import requests
import uuid

BASE_URL = "http://127.0.0.1:8000"

def test_user_flow():
    # 1. Test Register
    test_email = f"user-{uuid.uuid4().hex[:6]}@example.com"
    test_username = f"testuser_{uuid.uuid4().hex[:6]}"
    
    register_payload = {
        "username": test_username,
        "email": test_email,
        "password": "testpassword123",
        "phone": "+123456789",
        "diets": ["Vegetarian"],
        "allergies": ["Nuts"],
        "budget": "$30",
        "taste": "Spicy",
        "preferred_language": "zh"
    }
    
    print("\n--- Testing Register ---")
    res = requests.post(f"{BASE_URL}/auth/register", json=register_payload)
    print(f"Status Code: {res.status_code}")
    if res.status_code != 200:
        print(f"Error: {res.text}")
        return
        
    data = res.json()
    token = data["token"]
    user = data["user"]
    print(f"Token: {token}")
    print(f"User Registered: {user['username']} ({user['email']})")
    
    # 2. Test Login
    login_payload = {
        "email": test_email,
        "password": "testpassword123"
    }
    print("\n--- Testing Login ---")
    res = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    print(f"Status Code: {res.status_code}")
    if res.status_code == 200:
        login_data = res.json()
        print(f"Login Success! Welcome back {login_data['user']['username']}")
        
    # 3. Test GET /auth/me
    print("\n--- Testing GET /auth/me ---")
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    print(f"Status Code: {res.status_code}")
    if res.status_code == 200:
        print(f"User Details: {res.json()}")
        
    # 4. Test Update Profile
    update_payload = {
        "budget": "$50",
        "taste": "Mild",
        "allergies": ["Nuts", "Seafood"]
    }
    print("\n--- Testing Profile Update ---")
    res = requests.post(f"{BASE_URL}/auth/profile", json=update_payload, headers=headers)
    print(f"Status Code: {res.status_code}")
    if res.status_code == 200:
        print(f"Updated Profile: {res.json()}")
        
    # 5. Test Google Login (Auto Register)
    google_payload = {
        "email": f"google-{uuid.uuid4().hex[:6]}@gmail.com",
        "name": "Google User",
        "avatar_url": "https://lh3.googleusercontent.com/a/some-avatar"
    }
    print("\n--- Testing Google Auth ---")
    res = requests.post(f"{BASE_URL}/auth/google", json=google_payload)
    print(f"Status Code: {res.status_code}")
    if res.status_code == 200:
        google_data = res.json()
        print(f"Google Login Success! Token: {google_data['token']}")
        print(f"Created/Fetched User: {google_data['user']}")

if __name__ == "__main__":
    test_user_flow()
