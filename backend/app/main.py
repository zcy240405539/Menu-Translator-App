import uuid
import re
import time
import os
from pathlib import Path
from io import BytesIO
from PIL import Image
from typing import List
from fastapi import (
    BackgroundTasks,
    FastAPI,
    UploadFile,
    File,
    HTTPException,
    Depends, Body,
)
from app.services.pdf_service import pdf_bytes_to_images
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from app.core.database import get_db, engine, Base
from app.core.models import DishCache, DishImage, User, UserSubscription
from app.core.schemas import (
    SubscriptionResponse,
    AnalyzeTextRequest,
    DishDetailRequest,
    RecommendRequest,
    UserRegisterRequest,
    UserLoginRequest,
    GoogleLoginRequest,
    UserProfileUpdate,
    UserResponse,
)
from app.services.auth_service import (
    register_user as sb_register_user,
    login_user as sb_login_user,
    get_user_from_token as sb_get_user_from_token,
    google_login_or_register as sb_google_login_or_register,
)
from fastapi import Header
from typing import Optional
from app.services.image_service import supabase
from app.services.openrouter_service import (
    call_openrouter_for_dish_detail,
    call_openrouter_for_menu,
    call_openrouter_for_menu_layout,
    call_openrouter_for_missing_dish_details,
    call_openrouter_vision_for_menu,
    call_openrouter_translate_category_labels,
    extract_dish_candidates_from_ocr_blocks,
    call_openrouter_for_recommendation,
)
from app.services.dish_cache_service import (
    build_normalized_dish_key,
    infer_menu_cuisine,
    is_cacheable_normalized_name,
    resolve_dish_cuisine,
)
from app.services.image_service import get_or_create_dish_image
from app.services.category_service import get_or_create_menu_category
from app.core.i18n_service import get_language_options, DEFAULT_SOURCE_LANGUAGE, DEFAULT_TARGET_LANGUAGE
from app.services.pdf_text_service import extract_text_from_pdf_bytes

# 创建数据库表
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Menu Translator API")

# =========================
# Static
# =========================

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"

app.mount(
    "/static",
    StaticFiles(directory=str(STATIC_DIR)),
    name="static",
)


# =========================
# Auth API Endpoints
# =========================

def to_user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        phone=user.phone,
        avatar_url=user.avatar_url,
        diets=user.diets or [],
        allergies=user.allergies or [],
        budget=user.budget,
        taste=user.taste,
        preferred_language=user.preferred_language or "zh"
    )

def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> User:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization Header")
    try:
        token = authorization.split(" ")[1]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Authorization Header Format")
    
    user = sb_get_user_from_token(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid Session Token")
    return user


@app.post("/auth/register")
def register_user(request: UserRegisterRequest, db: Session = Depends(get_db)):
    try:
        res = sb_register_user(
            db=db,
            username=request.username,
            email=request.email,
            password=request.password,
            phone=request.phone,
            diets=request.diets,
            allergies=request.allergies,
            budget=request.budget,
            taste=request.taste,
            preferred_language=request.preferred_language,
        )
        return {"token": res["token"], "user": to_user_response(res["user"])}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/auth/login")
def login_user(request: UserLoginRequest, db: Session = Depends(get_db)):
    try:
        res = sb_login_user(db, request.email, request.password)
        return {"token": res["token"], "user": to_user_response(res["user"])}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/auth/google")
def google_login(request: GoogleLoginRequest, db: Session = Depends(get_db)):
    try:
        res = sb_google_login_or_register(
            db=db,
            email=request.email,
            name=request.name,
            avatar_url=request.avatar_url,
        )
        return {"token": res["token"], "user": to_user_response(res["user"])}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return to_user_response(current_user)


@app.post("/auth/profile", response_model=UserResponse)
def update_profile(request: UserProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if request.phone is not None:
        current_user.phone = request.phone
    if request.diets is not None:
        current_user.diets = request.diets
    if request.allergies is not None:
        current_user.allergies = request.allergies
    if request.budget is not None:
        current_user.budget = request.budget
    if request.taste is not None:
        current_user.taste = request.taste
    if request.preferred_language is not None:
        current_user.preferred_language = request.preferred_language
        
    db.commit()
    db.refresh(current_user)
    return to_user_response(current_user)


@app.post("/auth/logout")
def logout_user():
    return {"status": "success"}


@app.post("/auth/avatar")
def upload_avatar(file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
            
        contents = file.file.read()
        ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        filename = f"user-{current_user.id}-{uuid.uuid4().hex[:8]}.{ext}"
        storage_path = f"avatars/{filename}"
        
        try:
            supabase.storage.create_bucket("avatars", {"public": True})
        except Exception:
            pass
            
        supabase.storage.from_("avatars").upload(
            storage_path,
            contents,
            {
                "content-type": file.content_type,
                "upsert": "true",
            },
        )
        
        public_url = supabase.storage.from_("avatars").get_public_url(storage_path)
        
        current_user.avatar_url = public_url
        db.commit()
        db.refresh(current_user)
        
        return {"avatar_url": public_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload avatar: {str(e)}")

# =========================
# CORS
# =========================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def is_render_runtime() -> bool:
    return bool(
        os.getenv("RENDER")
        or os.getenv("RENDER_SERVICE_ID")
        or os.getenv("RENDER_EXTERNAL_URL")
    )


def should_use_vision_ocr() -> bool:
    provider = os.getenv("OCR_PROVIDER", "").strip().lower()

    if provider in {"vision", "openrouter", "cloud"}:
        return True

    if provider in {"paddle", "local", "paddleocr"}:
        return False

    return is_render_runtime()


def load_local_ocr_functions():
    from app.services.ocr_service import extract_layout_blocks_from_image, extract_text_from_image

    return extract_layout_blocks_from_image, extract_text_from_image


def vision_layout_to_ocr_blocks(vision_result: dict) -> list[dict]:
    lines = vision_result.get("layout_lines") or []
    if not lines:
        lines = [
            {"text": line, "line_role": "ocr_line", "y_order": index}
            for index, line in enumerate(vision_result.get("ocr_lines") or [])
        ]

    blocks = []

    for index, line in enumerate(lines):
        if not isinstance(line, dict):
            continue

        text = str(line.get("text") or "").strip()
        description = str(line.get("description_text") or "").strip()
        price = line.get("price_text")
        role = str(line.get("line_role") or "").strip()

        if not text:
            continue

        parts = [text]
        if description:
            parts.append(description)
        if price:
            parts.append(str(price).strip())

        y_order = line.get("y_order")
        x_order = line.get("x_order")
        try:
            y = float(y_order)
        except (TypeError, ValueError):
            y = float(index)
        try:
            x = float(x_order)
        except (TypeError, ValueError):
            x = 0.0

        combined_text = " | ".join(part for part in parts if part)

        blocks.append({
            "text": combined_text,
            "line_role": role,
            "x_min": x * 100,
            "y_min": y * 40,
            "x_max": x * 100 + 100,
            "y_max": y * 40 + 20,
            "center_x": x * 100 + 50,
            "center_y": y * 40 + 10,
            "confidence": 0.9,
            "ocr_lang": "openrouter_vision",
        })

    return blocks


def parse_image_with_vision(
    file_bytes: bytes,
    target_lang: str,
    source_lang: str,
    mime_type: str = "image/jpeg",
) -> tuple[dict, list[dict]]:
    vision_result = call_openrouter_vision_for_menu(
        image_bytes=file_bytes,
        mime_type=mime_type,
        target_lang=target_lang,
        source_lang=source_lang,
    )
    ocr_blocks = vision_layout_to_ocr_blocks(vision_result)

    if not ocr_blocks:
        return {
            "source_language": vision_result.get("source_language") or source_lang,
            "target_language": target_lang,
            "restaurant_type": vision_result.get("restaurant_type"),
            "menu_items": [],
            "menu_pricing": vision_result.get("menu_pricing") or [],
            "parser": "openrouter_vision_empty",
            "ocr_blocks": [],
        }, []

    try:
        result = call_openrouter_for_menu_layout(
            ocr_blocks=ocr_blocks,
            target_lang=target_lang,
            source_lang=source_lang,
        )

        if not isinstance(result, dict):
            result = {}

    except Exception as layout_error:
        print(f"Vision layout parser failed, using rule fallback: {layout_error}")
        result = extract_dish_candidates_from_ocr_blocks(
            ocr_blocks=ocr_blocks,
            target_lang=target_lang,
            source_lang=source_lang,
        )
        result["parser"] = "openrouter_vision_rule_fallback"

    if vision_result.get("menu_pricing"):
        result["menu_pricing"] = vision_result.get("menu_pricing")

    result["parser"] = result.get("parser") or "openrouter_vision_layout_openrouter"
    result["ocr_blocks"] = ocr_blocks

    return result, ocr_blocks

# =========================
# Health
# =========================

@app.get("/health")
@app.head("/health")
async def health():
    return {
        "status": "ok",
        "service": "AI Menu Backend"
    }


# =========================
# GET Cached Menu
# =========================

@app.get("/menus/cache/{image_hash}")
def get_cached_menu(image_hash: str, target_lang: str = "zh", db: Session = Depends(get_db)):
    from app.services.menu_cache_service import get_menu_cache
    record = get_menu_cache(db, image_hash, target_lang)
    if not record:
        raise HTTPException(status_code=404, detail="Menu cache not found")
    
    result = record.structure_result or {}
    result["menu_items"] = record.menu_items or []
    result["ocr_blocks"] = record.ocr_blocks or []
    result["business_name"] = record.business_name
    result["business_description"] = record.business_description or {}
    result["image_hash"] = record.image_hash
    return result
# =========================
# DB TEST
# =========================

@app.get("/db/test")
def db_test(db: Session = Depends(get_db)):
    try:
        dish_count = db.query(DishCache.id).count()
        image_count = db.query(DishImage.id).count()

        return {
            "status": "connected",
            "dish_cache_count": dish_count,
            "dish_images_count": image_count,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =========================
# OCR
# =========================

@app.post("/menus/ocr")
async def menu_ocr(
    file: UploadFile = File(...),
    source_lang: str = "auto",
):
    try:
        file_bytes = await file.read()
        if should_use_vision_ocr():
            vision_result = call_openrouter_vision_for_menu(
                image_bytes=file_bytes,
                mime_type=file.content_type or "image/jpeg",
                target_lang="zh",
                source_lang=source_lang,
            )
            blocks = vision_layout_to_ocr_blocks(vision_result)
            ocr_text = "\n".join(b["text"] for b in blocks if b.get("text"))
        else:
            _, extract_text_from_image = load_local_ocr_functions()
            ocr_text = extract_text_from_image(file_bytes, source_lang=source_lang)

        return {
            "ocr_text": ocr_text
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =========================
# Layout OCR
# =========================

@app.post("/menus/layout")
async def menu_layout(
    file: UploadFile = File(...),
    source_lang: str = "auto",
):
    try:
        file_bytes = await file.read()
        if should_use_vision_ocr():
            vision_result = call_openrouter_vision_for_menu(
                image_bytes=file_bytes,
                mime_type=file.content_type or "image/jpeg",
                target_lang="zh",
                source_lang=source_lang,
            )
            blocks = vision_layout_to_ocr_blocks(vision_result)
        else:
            extract_layout_blocks_from_image, _ = load_local_ocr_functions()
            blocks = extract_layout_blocks_from_image(
                file_bytes,
                source_lang=source_lang,
            )

        return {
            "count": len(blocks),
            "blocks": blocks,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =========================
# Analyze
# =========================

@app.post("/menus/analyze")
def analyze_menu(request: AnalyzeTextRequest):
    try:
        result = call_openrouter_for_menu(
            ocr_text=request.ocr_text,
            target_lang=request.target_lang,
            source_lang=getattr(request, "source_lang", "en"),
        )

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =========================
# Parse Menu
# =========================

@app.post("/menus/parse")
async def parse_menu(
    file: UploadFile = File(...),
    target_lang: str = "zh",
    source_lang: str = "en",
):
    try:
        file_bytes = await file.read()
        mime_type = file.content_type or "image/jpeg"

        if "pdf" in mime_type:
            images = pdf_bytes_to_images(file_bytes, max_pages=5)
            if not images:
                raise HTTPException(status_code=400, detail="PDF pages not extracted")

            file_bytes = merge_images_vertically(images)
            mime_type = "image/jpeg"

        if should_use_vision_ocr():
            result, ocr_blocks = parse_image_with_vision(
                file_bytes=file_bytes,
                target_lang=target_lang,
                source_lang=source_lang,
                mime_type=mime_type,
            )
        else:
            extract_layout_blocks_from_image, _ = load_local_ocr_functions()
            ocr_blocks = extract_layout_blocks_from_image(
                file_bytes,
                source_lang=source_lang,
            )

            if not ocr_blocks:
                raise HTTPException(
                    status_code=422,
                    detail="OCR did not detect readable text. Please retake the photo with better lighting.",
                )

            result = call_openrouter_for_menu_layout(
                ocr_blocks=ocr_blocks,
                target_lang=target_lang,
                source_lang=source_lang,
            )

            result["ocr_blocks"] = ocr_blocks
            result["parser"] = "paddleocr_layout_openrouter"

        result["source_lang_request"] = source_lang

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =========================
# AI Recommend
# =========================

@app.post("/menus/recommend")
def recommend_menu(request: RecommendRequest):
    try:
        result = call_openrouter_for_recommendation(
            menu_items=request.menu_items,
            people=request.people,
            diets=request.diets,
            allergies=request.allergies,
            budget=request.budget,
            taste=request.taste,
            target_lang=request.target_lang
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================
# Dish Detail
# =========================

@app.post("/dish/detail")
def dish_detail(
    request: DishDetailRequest,
    db: Session = Depends(get_db),
):
    try:
        normalized_name = build_normalized_dish_key(
            request.dish_name,
            request.original_name,
            request.translated_name,
        )
        is_cacheable = is_cacheable_normalized_name(normalized_name)
        request_ingredients = request.ingredients or []
        request_context = {
            "original_name": request.original_name or request.dish_name,
            "translated_name": request.translated_name,
            "description": request.description,
            "ingredients": request_ingredients,
            "image_prompt": request.image_prompt,
            "cuisine": resolve_dish_cuisine(
                {
                    "original_name": request.original_name or request.dish_name,
                    "translated_name": request.translated_name,
                    "description": request.description,
                    "ingredients": request_ingredients,
                    "image_prompt": request.image_prompt,
                    "cuisine": request.cuisine,
                    "section_heading_original": request.section_heading_original,
                }
            ),
            "section_heading_original": request.section_heading_original,
        }

        cached = None
        cached_image = None

        if is_cacheable:
            cached = (
                db.query(DishCache)
                .filter(
                    DishCache.normalized_name == normalized_name,
                    DishCache.target_language == request.target_lang,
                )
                .first()
            )

            cached_image = (
                db.query(DishImage)
                .filter(DishImage.normalized_name == normalized_name)
                .first()
            )

        if cached:
            dish_payload = {
                "original_name": cached.original_name or request.dish_name,
                "translated_name": request.translated_name or cached.translated_name,
                "description": request.description or cached.description,
                "ingredients": request_ingredients or cached.ingredients or [],
                "allergens": cached.allergens or [],
                "spicy_level": cached.spicy_level or 0,
                "image_prompt": request.image_prompt or cached.image_prompt,
                "cuisine": resolve_dish_cuisine(
                    {
                        "original_name": cached.original_name or request.dish_name,
                        "translated_name": request.translated_name or cached.translated_name,
                        "description": request.description or cached.description,
                        "ingredients": request_ingredients or cached.ingredients or [],
                        "image_prompt": request.image_prompt or cached.image_prompt,
                        "cuisine": request.cuisine or cached.cuisine,
                        "section_heading_original": request.section_heading_original,
                    }
                ),
                "section_heading_original": request.section_heading_original,
            }

            image_url = cached_image.image_url if cached_image else None
            thumbnail_url = cached_image.thumbnail_url if cached_image else None
            image_source = cached_image.source_type if cached_image else None

            if not image_url:
                image_url = get_or_create_dish_image(
                    db=db,
                    dish=dish_payload,
                    normalized_name=normalized_name,
                )
                thumbnail_url = image_url
                image_source = "web_found_or_generated" if image_url else None

            return {
                "name": cached.translated_name,
                "description": cached.description,
                "ingredients": cached.ingredients or [],
                "allergens": cached.allergens or [],
                "spicy_level": cached.spicy_level or 0,
                "image_prompt": cached.image_prompt,
                "image_url": image_url,
                "thumbnail_url": thumbnail_url,
                "image_source": image_source,
                "cuisine": cached.cuisine,
                "source": "cache",
            }

        detail_name = (
            request.dish_name
            or request.original_name
            or request.translated_name
            or ""
        )

        result = call_openrouter_for_dish_detail(
            dish_name=detail_name,
            target_lang=request.target_lang,
            source_lang=request.source_lang,
        )

        normalized_name = build_normalized_dish_key(
            result.get("translated_name"),
            result.get("original_name"),
            request.translated_name,
            request.dish_name,
            request.original_name,
        )
        is_cacheable = is_cacheable_normalized_name(normalized_name)

        if is_cacheable:
            result["cuisine"] = resolve_dish_cuisine(
                {
                    "original_name": request.original_name or detail_name,
                    "translated_name": result.get("translated_name"),
                    "description": result.get("description"),
                    "ingredients": result.get("ingredients") or [],
                    "image_prompt": result.get("image_prompt"),
                    "cuisine": result.get("cuisine"),
                    "section_heading_original": request.section_heading_original,
                }
            )
            new_cache = DishCache(
                normalized_name=normalized_name,
                original_name=request.original_name or detail_name,
                translated_name=result.get("translated_name"),
                target_language=request.target_lang,
                description=result.get("description"),
                ingredients=result.get("ingredients") or [],
                allergens=result.get("allergens") or [],
                spicy_level=result.get("spicy_level") or 0,
                image_prompt=result.get("image_prompt"),
                cuisine=result.get("cuisine"),
                source_language=result.get("source_language") or request.source_lang,
            )

            db.add(new_cache)
            db.commit()

        dish_payload = {
            "original_name": request.original_name or request.dish_name,
            "translated_name": result.get("translated_name") or result.get("name"),
            "description": result.get("description"),
            "ingredients": result.get("ingredients") or [],
            "allergens": result.get("allergens") or [],
            "spicy_level": result.get("spicy_level") or 0,
            "image_prompt": result.get("image_prompt"),
            "cuisine": result.get("cuisine"),
            "section_heading_original": request.section_heading_original,
        }

        dish_payload = {
            **dish_payload,
            **{key: value for key, value in request_context.items() if value},
        }

        image_url = None
        if is_cacheable:
            image_url = get_or_create_dish_image(
                db=db,
                dish=dish_payload,
                normalized_name=normalized_name,
            )

        return {
            **result,
            "image_url": image_url,
            "thumbnail_url": image_url,
            "image_source": "web_found_or_generated" if image_url else None,
            "source": "llm",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =========================
# Compress pictures
# =========================

def compress_image_bytes(file_bytes: bytes, max_size: int = 1400, quality: int = 70) -> bytes:
    try:
        img = Image.open(BytesIO(file_bytes))

        if img.mode != "RGB":
            img = img.convert("RGB")

        img.thumbnail((max_size, max_size))

        buffer = BytesIO()
        img.save(buffer, format="JPEG", quality=quality, optimize=True)

        return buffer.getvalue()

    except Exception as e:
        print("Image compression skipped:", e)
        return file_bytes
    

# =========================
# Translate category labels
# =========================

def is_useful_category_translation(value, original, target_lang):
    if not value:
        return False

    value = str(value).strip()
    original = str(original or "").strip()

    if not value:
        return False

    if value == original:
        return False

    if str(target_lang or "").lower().startswith("zh"):
        return any("\u4e00" <= ch <= "\u9fff" for ch in value)

    return True


def has_cjk_text(value) -> bool:
    return any("\u4e00" <= ch <= "\u9fff" for ch in str(value or ""))


def has_latin_text(value) -> bool:
    return bool(re.search(r"[A-Za-z]", str(value or "")))


def needs_dish_language_enrichment(item, target_lang: str) -> bool:
    translated_name = item.get("translated_name")
    description = item.get("description")
    ingredients = item.get("ingredients") or []
    ingredient_text = " ".join(str(x) for x in ingredients) if isinstance(ingredients, list) else str(ingredients)

    if str(target_lang or "").lower().startswith("zh"):
        if not has_cjk_text(translated_name):
            return True
        if not description or (has_latin_text(description) and not has_cjk_text(description)):
            return True
        if ingredient_text and has_latin_text(ingredient_text) and not has_cjk_text(ingredient_text):
            return True
        return False

    return not translated_name or not description


def collect_category_translation_map(menu_items, target_lang):
    category_map = {}

    for item in menu_items:
        section_original = (
            item.get("section_heading_original")
            or item.get("category")
            or "Other"
        )

        section_translated = item.get("section_heading_translated")

        if is_useful_category_translation(
            section_translated,
            section_original,
            target_lang,
        ):
            category_map[section_original] = section_translated

    return category_map


# =========================
# Async Tasks
# =========================

MENU_TASKS = {}
MENU_CACHE_SCHEMA_VERSION = 2

def run_menu_parse_task(
    task_id: str,
    file_bytes: bytes,
    target_lang: str,
    source_lang: str = "en",
):
    try:
        from app.core.database import SessionLocal
        from app.services.dish_cache_service import (
            apply_cache_to_items,
            infer_menu_cuisine,
            resolve_dish_cuisine,
            upsert_dish_cache,
        )
        from app.services.menu_cache_service import (
            calculate_image_hash,
            get_menu_cache,
            upsert_menu_cache,
        )

        MENU_TASKS[task_id]["status"] = "processing"
        task_started_at = time.perf_counter()
        timings = {}

        image_hash = calculate_image_hash(file_bytes)
        db = SessionLocal()

        try:
            cached_menu = get_menu_cache(db, image_hash, target_lang)

            if cached_menu:
                result = cached_menu.structure_result or {}
                result["menu_items"] = cached_menu.menu_items or []
                result["ocr_blocks"] = cached_menu.ocr_blocks or []
                result["business_name"] = cached_menu.business_name
                result["business_description"] = cached_menu.business_description or {}
                result["image_hash"] = image_hash

                if result.get("cache_schema_version") != MENU_CACHE_SCHEMA_VERSION:
                    print("Menu cache skipped because cache schema version changed.")
                elif any(needs_dish_language_enrichment(item, target_lang) for item in result["menu_items"]):
                    print("Menu cache skipped because translated fields need refresh.")
                else:
                    result["cache_summary"] = {
                        "menu_cache_hit": True,
                        "total_items": len(result.get("menu_items", [])),
                    }
                    result["timings"] = {
                        "total_seconds": round(time.perf_counter() - task_started_at, 3),
                        "cache_hit": True,
                    }
                    MENU_TASKS[task_id] = {
                        "status": "done",
                        "result": result,
                        "error": None,
                    }
                    return

            # =========================
            # 没命中菜单缓存，才做 OCR + 第一轮 OpenRouter
            # =========================
            content_type = MENU_TASKS[task_id].get("content_type", "") or "image/jpeg"
            source_lang = MENU_TASKS[task_id].get("source_lang", source_lang) or "en"

            ocr_blocks = []

            if "pdf" in content_type:
                print("PDF detected. Extracting embedded text...")

                pdf_text = MENU_TASKS[task_id].get("pdf_text", "")
                if not pdf_text:
                    pdf_text = extract_text_from_pdf_bytes(file_bytes, max_pages=5)

                if pdf_text:
                    print("PDF text extracted:", len(pdf_text))

                    result = call_openrouter_for_menu(
                        ocr_text=pdf_text,
                        target_lang=target_lang,
                        source_lang=source_lang,
                    )

                    if not isinstance(result, dict):
                        result = {}

                    result["parser"] = "pdf_text_openrouter"
                    result["ocr_blocks"] = [
                        {
                            "type": "pdf_text",
                            "text": pdf_text,
                        }
                    ]

                else:
                    print("No embedded PDF text found. Falling back to OCR...")

                    if should_use_vision_ocr():
                        result, ocr_blocks = parse_image_with_vision(
                            file_bytes=file_bytes,
                            target_lang=target_lang,
                            source_lang=source_lang,
                            mime_type="image/jpeg",
                        )
                        result["parser"] = "pdf_image_openrouter_vision"
                    else:
                        extract_layout_blocks_from_image, _ = load_local_ocr_functions()
                        ocr_blocks = extract_layout_blocks_from_image(
                            file_bytes,
                            source_lang=source_lang,
                        )

                        result = call_openrouter_for_menu_layout(
                            ocr_blocks=ocr_blocks,
                            target_lang=target_lang,
                            source_lang=source_lang,
                        )

                        if not isinstance(result, dict):
                            result = {}

                        result["parser"] = "pdf_image_ocr_openrouter"
                        result["ocr_blocks"] = ocr_blocks

            else:
                ocr_started_at = time.perf_counter()
                if should_use_vision_ocr():
                    result, ocr_blocks = parse_image_with_vision(
                        file_bytes=file_bytes,
                        target_lang=target_lang,
                        source_lang=source_lang,
                        mime_type=content_type or "image/jpeg",
                    )
                    timings["vision_ocr_seconds"] = round(time.perf_counter() - ocr_started_at, 3)

                else:
                    extract_layout_blocks_from_image, _ = load_local_ocr_functions()
                    ocr_blocks = extract_layout_blocks_from_image(
                        file_bytes,
                        source_lang=source_lang,
                    )
                    timings["ocr_seconds"] = round(time.perf_counter() - ocr_started_at, 3)

                    if not ocr_blocks:
                        print("OCR returned empty blocks. Falling back to OpenRouter Vision.")

                        result, ocr_blocks = parse_image_with_vision(
                            file_bytes=file_bytes,
                            target_lang=target_lang,
                            source_lang=source_lang,
                            mime_type=content_type or "image/jpeg",
                        )
                    else:
                        analysis_started_at = time.perf_counter()
                        result = call_openrouter_for_menu_layout(
                            ocr_blocks=ocr_blocks,
                            target_lang=target_lang,
                            source_lang=source_lang,
                        )
                        timings["analysis_seconds"] = round(time.perf_counter() - analysis_started_at, 3)

                        if not isinstance(result, dict):
                            result = {}

                        result["parser"] = "paddleocr_layout_openrouter"
                        result["ocr_blocks"] = ocr_blocks

            if "menu_items" not in result:
                result["menu_items"] = []

            if "business_name" not in result:
                result["business_name"] = None

            if "business_description" not in result or result["business_description"] is None:
                result["business_description"] = {}

            print("DEBUG OCR BLOCKS:", len(result.get("ocr_blocks", [])))
            print("DEBUG MENU ITEMS:", len(result.get("menu_items", [])))

            layout_lines = result.get("menu_items", []) or []
            source_language = result.get("source_language") or source_lang
            menu_items = layout_lines

            for item in menu_items:
                if not item.get("source_language"):
                    item["source_language"] = source_language

            result["menu_items"] = menu_items
            result["ocr_blocks"] = result.get("ocr_blocks", ocr_blocks)

            menu_cuisine = infer_menu_cuisine(
                menu_items=menu_items,
                restaurant_type=result.get("restaurant_type") or "",
                business_name=result.get("business_name") or "",
            )
            if menu_cuisine != "Other":
                result["restaurant_type"] = menu_cuisine

            for item in menu_items:
                item["cuisine"] = resolve_dish_cuisine(item, menu_cuisine)


            # =========================
            # Collect category translations before dish_cache merge
            # =========================

            category_translation_map = collect_category_translation_map(
                menu_items,
                target_lang,
            )

            enriched_items, missing_items = apply_cache_to_items(
                db=db,
                menu_items=menu_items,
                target_lang=target_lang,
            )

            for item in enriched_items:
                item["cuisine"] = resolve_dish_cuisine(item, menu_cuisine)

            stale_cached_items = [
                item
                for item in enriched_items
                if item.get("cache_hit") and needs_dish_language_enrichment(item, target_lang)
            ]

            for item in stale_cached_items:
                item["cache_hit"] = False
                missing_items.append(item)

            missing_items = [
                item
                for item in missing_items
                if needs_dish_language_enrichment(item, target_lang)
            ]

            print("DEBUG MISSING DETAIL ITEMS:", len(missing_items))
            missing_details = []
            if missing_items:
                detail_started_at = time.perf_counter()
                batch_size = 5

                for i in range(0, len(missing_items), batch_size):
                    batch = missing_items[i:i + batch_size]

                    try:
                        batch_details = call_openrouter_for_missing_dish_details(
                            dishes=batch,
                            target_lang=target_lang,
                            source_lang=source_lang,
                        )

                        if isinstance(batch_details, list):
                            missing_details.extend(batch_details)
                            print("DEBUG DETAIL BATCH DONE:", len(missing_details))

                    except Exception as e:
                        print("Batch dish detail failed, retrying one by one:", e)

                        for single_item in batch:
                            try:
                                single_details = call_openrouter_for_missing_dish_details(
                                    dishes=[single_item],
                                    target_lang=target_lang,
                                    source_lang=source_lang,
                                )

                                if isinstance(single_details, list):
                                    missing_details.extend(single_details)

                            except Exception as single_error:
                                print("Single dish detail failed:", single_error)

                                # 最差情况下也返回原文，不让前端空白
                                missing_details.append({
                                    "id": single_item.get("id"),
                                    "original_name": single_item.get("original_name"),
                                    "source_language": single_item.get("source_language") or source_lang,
                                    "translated_name": single_item.get("original_name"),
                                    "description": "",
                                    "ingredients": [],
                                    "allergens": [],
                                    "spicy_level": 0,
                                    "image_prompt": "",
                                    "cuisine": "Other",
                                    "section_heading_translated": single_item.get("section_heading_original"),
                                })

                timings["detail_seconds"] = round(time.perf_counter() - detail_started_at, 3)
            else:
                timings["detail_seconds"] = 0

            # =========================
            # Merge OpenRouter details back
            # =========================

            detail_map = {
                x.get("id"): x
                for x in missing_details
                if x.get("id")
            }

            final_items = []

            if not enriched_items:
                enriched_items = menu_items
            for item in enriched_items:
                if item.get("cache_hit"):
                    item["cuisine"] = resolve_dish_cuisine(item, menu_cuisine)
                    try:
                        upsert_dish_cache(
                            db=db,
                            dish=item,
                            target_lang=target_lang,
                        )
                    except Exception as cache_error:
                        print("Cached dish cuisine refresh failed:", cache_error)
                    final_items.append(item)
                    continue

                detail = detail_map.get(item.get("id"))

                 # Define picture search variables
                if detail:
                    item.update(detail)

                cuisine = resolve_dish_cuisine(item, menu_cuisine)
                item["cuisine"] = cuisine

                dish_name = (
                    item.get("original_name")
                    or item.get("translated_name")
                    or ""
                )

                restaurant_type = result.get("restaurant_type") or ""
                item["image_prompt"] = (
                    f"{cuisine} {restaurant_type} dish for {dish_name}"
                ).strip()
                print("Searched for image:", ["image_prompt"])

                # 不管 OpenRouter 成功失败，都写入数据库
                try:
                    upsert_dish_cache(
                        db=db,
                        dish=item,
                        target_lang=target_lang,
                    )
                except Exception as cache_error:
                    print("Dish cache upsert failed:", cache_error)

                final_items.append(item)

            enriched_items = final_items
            original_category_by_id = {
                item.get("id"): {
                    "section_heading_original": item.get("section_heading_original"),
                    "section_heading_translated": item.get("section_heading_translated"),
                    "category": item.get("category"),
                }
                for item in menu_items
                if item.get("id")
            }

            # =========================
            # Final Category Sync
            # Must run AFTER dish_cache merge
            # =========================

            all_category_originals = []

            for item in enriched_items:
                original_category = original_category_by_id.get(item.get("id"), {})
                section_original = (
                    original_category.get("section_heading_original")
                    or item.get("section_heading_original")
                    or original_category.get("category")
                    or item.get("category")
                    or "Other"
                )

                if section_original not in all_category_originals:
                    all_category_originals.append(section_original)

            missing_category_labels = [
                label
                for label in all_category_originals
                if not is_useful_category_translation(
                    category_translation_map.get(label),
                    label,
                    target_lang,
                )
            ]

            if missing_category_labels:
                try:
                    translated_categories = call_openrouter_translate_category_labels(
                        labels=missing_category_labels,
                        target_lang=target_lang,
                        source_lang=source_lang,
                    )

                    for label, translated in translated_categories.items():
                        if is_useful_category_translation(translated, label, target_lang):
                            category_translation_map[label] = translated

                except Exception as category_translate_error:
                    print("Category translation failed:", category_translate_error)


            for item in enriched_items:
                section_original = (
                    item.get("section_heading_original")
                    or item.get("category")
                    or "Other"
                )

                section_translated = (
                    category_translation_map.get(section_original)
                    or original_category.get("section_heading_translated")
                    or item.get("section_heading_translated")
                    or section_original
                )

                try:
                    category_record = get_or_create_menu_category(
                        db=db,
                        original_label=section_original,
                        source_language=source_lang,
                        target_language=target_lang,
                        translate_func=lambda original, target, text=section_translated: text,
                    )

                    item["category_id"] = category_record.id
                    item["category_key"] = category_record.normalized_key
                    item["category_display_name"] = category_record.translated_label
                    item["section_heading_original"] = category_record.original_label
                    item["section_heading_translated"] = category_record.translated_label

                except Exception as category_error:
                    print("Final category upsert failed:", category_error)


            result["menu_items"] = enriched_items or menu_items
            result["ocr_blocks"] = result.get("ocr_blocks", ocr_blocks)
            result["image_hash"] = image_hash
            result["cache_summary"] = {
                "menu_cache_hit": False,
                "total_items": len(enriched_items),
                "dish_cache_hits": len([x for x in enriched_items if x.get("cache_hit")]),
                "dish_cache_misses": len([x for x in enriched_items if not x.get("cache_hit")]),
            }
            result["cache_schema_version"] = MENU_CACHE_SCHEMA_VERSION
            timings["total_seconds"] = round(time.perf_counter() - task_started_at, 3)
            result["timings"] = timings

            upsert_menu_cache(
                db=db,
                image_hash=image_hash,
                target_lang=target_lang,
                result=result,
                ocr_blocks=result.get("ocr_blocks", ocr_blocks),
            )

        finally:
            db.close()

        MENU_TASKS[task_id] = {
            "status": "done",
            "result": result,
            "error": None,
        }

    except Exception as e:
        MENU_TASKS[task_id] = {
            "status": "error",
            "result": None,
            "error": str(e),
        }
        

# =========================
# Start Parse
# =========================

@app.post("/menus/parse/start")
async def start_parse_menu(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    target_lang: str = "zh",
    source_lang: str = "en",
):
    try:
        file_bytes = await file.read()
        content_type = file.content_type or ""

        if "pdf" in content_type:
            pdf_text = extract_text_from_pdf_bytes(file_bytes, max_pages=5)

            if pdf_text:
                task_id = str(uuid.uuid4())

                MENU_TASKS[task_id] = {
                    "status": "queued",
                    "result": None,
                    "error": None,
                    "content_type": "application/pdf_text",
                    "source_lang": source_lang,
                    "pdf_text": pdf_text,
                }

                background_tasks.add_task(
                    run_menu_parse_task,
                    task_id,
                    file_bytes,
                    target_lang,
                    source_lang,
                )

                return {
                    "task_id": task_id,
                    "status": "queued",
                }

            images = pdf_bytes_to_images(file_bytes, max_pages=5)
            if not images:
                raise Exception("PDF pages not extracted")

            file_bytes = compress_image_bytes(images[0], max_size=2200, quality=85)
            content_type = "image/jpeg"

        elif "image" in content_type:
            file_bytes = compress_image_bytes(file_bytes)
            content_type = "image/jpeg"                                                                         

        task_id = str(uuid.uuid4())

        MENU_TASKS[task_id] = {
            "status": "queued",
            "result": None,
            "error": None,
            "content_type": content_type,
            "source_lang": source_lang,
        }

        background_tasks.add_task(
            run_menu_parse_task,
            task_id,
            file_bytes,
            target_lang,
            source_lang,
        )

        return {
            "task_id": task_id,
            "status": "queued",
        }

    except Exception as e:
        print("Start parse failed:", e)
        raise HTTPException(status_code=500, detail=str(e))
    
# =========================
# Task Status
# =========================

@app.get("/menus/parse/status/{task_id}")
async def get_parse_status(task_id: str):
    task = MENU_TASKS.get(task_id)

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task not found",
        )

    return task

# =========================
# Multi-language Support
# =========================

@app.get("/i18n/languages")
def languages():
    return {
        "default_source_language": DEFAULT_SOURCE_LANGUAGE,
        "default_target_language": DEFAULT_TARGET_LANGUAGE,
        "languages": get_language_options(),
    }


def merge_images_vertically(image_bytes_list: list[bytes]) -> bytes:
    images = [Image.open(BytesIO(b)).convert("RGB") for b in image_bytes_list]

    width = max(img.width for img in images)
    total_height = sum(img.height for img in images)

    merged = Image.new("RGB", (width, total_height), "white")

    y = 0
    for img in images:
        merged.paste(img, (0, y))
        y += img.height

    buffer = BytesIO()
    merged.save(buffer, format="JPEG", quality=70, optimize=True)
    return buffer.getvalue()
