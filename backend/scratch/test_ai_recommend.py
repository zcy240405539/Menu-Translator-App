import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

load_dotenv(dotenv_path=backend_dir / ".env")

from app.services.openrouter_service import call_openrouter_for_recommendation

def test_recommendation():
    # 模拟一个菜单列表
    mock_menu_items = [
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
        },
        {
            "id": "dish_003",
            "original_name": "Vegetarian Pasta",
            "translated_name": "素食意面",
            "price": "$14.00",
            "category": "mains",
            "description": "Spaghetti tossed with fresh vegetables, garlic and olive oil.",
            "ingredients": ["Spaghetti", "Zucchini", "Garlic", "Olive Oil"],
            "allergens": ["Gluten"],
            "spicy_level": 0
        },
        {
            "id": "dish_004",
            "original_name": "Spicy Chicken Wings",
            "translated_name": "辣鸡翅",
            "price": "$12.00",
            "category": "starters",
            "description": "Spicy buffalo style chicken wings.",
            "ingredients": ["Chicken Wings", "Buffalo Sauce"],
            "allergens": [],
            "spicy_level": 3
        }
    ]

    print("Sending mock menu items and user preferences to AI...")
    
    # 场景 1：2个人，素食，预算 $30，清淡口味
    print("\n--- Test Case 1: 2 People, Vegetarian, Budget $30, Taste: Light ---")
    try:
        res1 = call_openrouter_for_recommendation(
            menu_items=mock_menu_items,
            people=2,
            diets=["Vegetarian"],
            budget="$30",
            taste="Light",
            target_lang="zh"
        )
        print("Success! Response JSON:")
        print(json.dumps(res1, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Failed! Error: {e}")

    # 场景 2：1个人，无限制，预算无限制，喜欢吃辣
    print("\n--- Test Case 2: 1 Person, No Diet Limit, No Budget, Likes Spicy ---")
    try:
        res2 = call_openrouter_for_recommendation(
            menu_items=mock_menu_items,
            people=1,
            diets=[],
            budget=None,
            taste="Spicy",
            target_lang="zh"
        )
        print("Success! Response JSON:")
        print(json.dumps(res2, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Failed! Error: {e}")

if __name__ == "__main__":
    test_recommendation()
