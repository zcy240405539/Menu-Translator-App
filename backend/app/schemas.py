from pydantic import BaseModel
from typing import List, Optional


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
