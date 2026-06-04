import requests
import json

def test_http_recommendation():
    url = "http://127.0.0.1:8000/menus/recommend"
    payload = {
        "menu_items": [
            {
                "id": "dish_001",
                "original_name": "Beef Steak",
                "translated_name": "牛排",
                "price": "$28.00",
                "category": "mains",
                "description": "Premium grilled beef steak with black pepper sauce.",
                "ingredients": ["Beef", "Black Pepper", "Butter"],
                "allergens": ["Dairy"],
                "spicy_level": 1
            },
            {
                "id": "dish_002",
                "original_name": "Garden Salad",
                "translated_name": "田园沙拉",
                "price": "$10.00",
                "category": "starters",
                "description": "Fresh mixed greens with cherry tomatoes and vinaigrette dressing.",
                "ingredients": ["Lettuce", "Tomatoes", "Cucumber", "Vinaigrette"],
                "allergens": [],
                "spicy_level": 0
            }
        ],
        "people": 2,
        "diets": ["Vegetarian"],
        "budget": "$20",
        "taste": "Light",
        "target_lang": "zh"
    }

    print("Sending POST request to:", url)
    try:
        response = requests.post(url, json=payload, timeout=30)
        print("Status Code:", response.status_code)
        if response.status_code == 200:
            print("Success! Response:")
            print(json.dumps(response.json(), indent=2, ensure_ascii=False))
        else:
            print("Failed! Response:", response.text)
    except Exception as e:
        print("Request failed:", e)

if __name__ == "__main__":
    test_http_recommendation()
