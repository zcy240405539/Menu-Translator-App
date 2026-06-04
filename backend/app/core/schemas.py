from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class DishItem(BaseModel):
    id: str
    original_name: str
    translated_name: str

    price: Optional[str] = None
    category: Optional[str] = None
    section_heading_original: Optional[str] = None
    section_heading_translated: Optional[str] = None
    description: str

    ingredients: List[str] = []
    allergens: List[str] = []

    spicy_level: Optional[int] = 0
    image_prompt: Optional[str] = None
    cuisine: Optional[str] = None
    confidence: Optional[float] = None


class MenuAnalysisResult(BaseModel):
    source_language: str
    target_language: Optional[str] = None
    restaurant_type: Optional[str] = None
    menu_items: List[DishItem]


class AnalyzeTextRequest(BaseModel):
    ocr_text: str
    target_lang: str = "zh"


class DishDetailRequest(BaseModel):
    dish_name: str
    target_lang: str = "zh"
    source_lang: str = "auto"
    original_name: Optional[str] = None
    translated_name: Optional[str] = None
    description: Optional[str] = None
    ingredients: Optional[List[str]] = None
    cuisine: Optional[str] = None
    image_prompt: Optional[str] = None
    section_heading_original: Optional[str] = None


class RecommendRequest(BaseModel):
    menu_items: List[dict]
    people: Optional[int] = None
    diets: Optional[List[str]] = None
    allergies: Optional[List[str]] = None
    budget: Optional[str] = None
    taste: Optional[str] = None
    target_lang: str = "zh"


class UserRegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    phone: Optional[str] = None
    diets: List[str] = []
    allergies: List[str] = []
    budget: Optional[str] = None
    taste: Optional[str] = None
    preferred_language: str = "zh"


class UserLoginRequest(BaseModel):
    email: str
    password: str


class GoogleLoginRequest(BaseModel):
    email: str
    name: str
    avatar_url: Optional[str] = None


class UserProfileUpdate(BaseModel):
    phone: Optional[str] = None
    diets: Optional[List[str]] = None
    allergies: Optional[List[str]] = None
    budget: Optional[str] = None
    taste: Optional[str] = None
    preferred_language: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    diets: List[str] = []
    allergies: List[str] = []
    budget: Optional[str] = None
    taste: Optional[str] = None
    preferred_language: str
    subscription_plan: Optional[str] = "free"


class SubscriptionResponse(BaseModel):
    id: int
    user_id: str
    plan: str
    status: str
    is_expired: bool
    expired_at: Optional[datetime] = None
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    purchase_token: Optional[str] = None
    original_transaction_id: Optional[str] = None

    class Config:
        from_attributes = True



