import uuid
from pathlib import Path

from fastapi import (
    BackgroundTasks,
    FastAPI,
    UploadFile,
    File,
    HTTPException,
    Depends,
)

from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from sqlalchemy.orm import Session

from app.database import get_db, engine, Base
from app.models import DishCache, DishImage

from app.schemas import AnalyzeTextRequest, DishDetailRequest

from app.ocr_service import (
    extract_text_from_image,
)

from app.openrouter_service import (
    call_openrouter_for_menu,
    call_openrouter_for_dish_detail,
)
from app.dish_cache_service import normalize_dish_name
from app.image_service import get_or_create_dish_image

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
# CORS
# =========================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# Health
# =========================

@app.get("/health")
def health_check():
    return {"status": "ok"}

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
async def menu_ocr(file: UploadFile = File(...)):
    try:
        file_bytes = await file.read()

        ocr_text = extract_text_from_image(file_bytes)

        return {
            "ocr_text": ocr_text
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =========================
# Layout OCR
# =========================

@app.post("/menus/layout")
async def menu_layout(file: UploadFile = File(...)):
    try:
        from app.ocr_service import extract_layout_blocks_from_image

        file_bytes = await file.read()

        blocks = extract_layout_blocks_from_image(file_bytes)

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
):
    try:
        from app.ocr_service import extract_layout_blocks_from_image
        from app.openrouter_service import (
            call_openrouter_for_menu_layout,
        )

        file_bytes = await file.read()

        ocr_blocks = extract_layout_blocks_from_image(file_bytes)

        result = call_openrouter_for_menu_layout(
            ocr_blocks=ocr_blocks,
            target_lang=target_lang,
        )

        result["ocr_blocks"] = ocr_blocks

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
        normalized_name = normalize_dish_name(request.dish_name)

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
                "translated_name": cached.translated_name,
                "description": cached.description,
                "ingredients": cached.ingredients or [],
                "allergens": cached.allergens or [],
                "spicy_level": cached.spicy_level or 0,
                "image_prompt": cached.image_prompt,
                "cuisine": cached.cuisine,
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

        result = call_openrouter_for_dish_detail(
            dish_name=request.dish_name,
            target_lang=request.target_lang, 
        )

        new_cache = DishCache(
            normalized_name=normalized_name,
            original_name=request.dish_name,
            translated_name=result.get("translated_name"),
            target_language=request.target_lang,
            description=result.get("description"),
            ingredients=result.get("ingredients") or [],
            allergens=result.get("allergens") or [],
            spicy_level=result.get("spicy_level") or 0,
            image_prompt=result.get("image_prompt"),
            cuisine=result.get("cuisine"),
            source_language=result.get("source_language"),
        )

        db.add(new_cache)
        db.commit()

        dish_payload = {
            "original_name": request.dish_name,
            "translated_name": result.get("translated_name") or result.get("name"),
            "description": result.get("description"),
            "ingredients": result.get("ingredients") or [],
            "allergens": result.get("allergens") or [],
            "spicy_level": result.get("spicy_level") or 0,
            "image_prompt": result.get("image_prompt"),
            "cuisine": result.get("cuisine"),
        }

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
# Async Tasks
# =========================

MENU_TASKS = {}

def run_menu_parse_task(
    task_id: str,
    file_bytes: bytes,
    target_lang: str,
):
    try:
        from app.ocr_service import extract_layout_blocks_from_image
        from app.openrouter_service import (
            call_openrouter_for_menu_structure,
            call_openrouter_for_missing_dish_details,
        )
        from app.database import SessionLocal
        from app.dish_cache_service import (
            apply_cache_to_items,
            upsert_dish_cache,
        )
        from app.menu_cache_service import (
            calculate_image_hash,
            get_menu_cache,
            upsert_menu_cache,
        )

        MENU_TASKS[task_id]["status"] = "processing"

        image_hash = calculate_image_hash(file_bytes)
        db = SessionLocal()

        try:
            cached_menu = get_menu_cache(db, image_hash, target_lang)

            if cached_menu:
                result = cached_menu.structure_result or {}
                result["menu_items"] = cached_menu.menu_items or []
                result["ocr_blocks"] = cached_menu.ocr_blocks or []
                result["cache_summary"] = {
                    "menu_cache_hit": True,
                    "total_items": len(result.get("menu_items", [])),
                }

                MENU_TASKS[task_id] = {
                    "status": "done",
                    "result": result,
                    "error": None,
                }
                return

            # 没命中菜单缓存，才做 OCR + 第一轮 OpenRouter
            content_type = MENU_TASKS[task_id].get("content_type", "")

            all_ocr_blocks = []

            if "pdf" in content_type:
                from app.pdf_service import pdf_bytes_to_images

                page_images = pdf_bytes_to_images(file_bytes, max_pages=5)

                for page_index, page_bytes in enumerate(page_images):
                    page_blocks = extract_layout_blocks_from_image(page_bytes)

                    for block in page_blocks:
                        block["page"] = page_index + 1

                    all_ocr_blocks.extend(page_blocks)

            else:
                all_ocr_blocks = extract_layout_blocks_from_image(file_bytes)

            ocr_blocks = all_ocr_blocks


            result = call_openrouter_for_menu_structure(
                ocr_blocks=ocr_blocks,
                target_lang=target_lang,
            )

            menu_items = result.get("menu_items", [])

            enriched_items, missing_items = apply_cache_to_items(
                db=db,
                menu_items=menu_items,
                target_lang=target_lang,
            )

            if missing_items:
                missing_details = []

                batch_size = 10

                for i in range(0, len(missing_items), batch_size):
                    batch = missing_items[i:i + batch_size]

                    batch_details = call_openrouter_for_missing_dish_details(
                        dishes=batch,
                        target_lang=target_lang,
                    )

                    if isinstance(batch_details, list):
                        missing_details.extend(batch_details)   

                detail_map = {
                    item.get("id"): item
                    for item in missing_details
                }

                for item in enriched_items:
                    if not item.get("cache_hit"):
                        detail = detail_map.get(item.get("id"))

                        if detail:
                            item.update(detail)
                            upsert_dish_cache(
                                db=db,
                                dish=item,
                                target_lang=target_lang,
                            )

            result["menu_items"] = enriched_items
            result["ocr_blocks"] = ocr_blocks
            result["cache_summary"] = {
                "menu_cache_hit": False,
                "total_items": len(enriched_items),
                "dish_cache_hits": len([x for x in enriched_items if x.get("cache_hit")]),
                "dish_cache_misses": len([x for x in enriched_items if not x.get("cache_hit")]),
            }

            upsert_menu_cache(
                db=db,
                image_hash=image_hash,
                target_lang=target_lang,
                result=result,
                ocr_blocks=ocr_blocks,
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
):
    try:
        file_bytes = await file.read()
        task_id = str(uuid.uuid4())

        MENU_TASKS[task_id] = {
            "status": "queued",
            "result": None,
            "error": None,
            "content_type": file.content_type or "",
        }

        background_tasks.add_task(
            run_menu_parse_task,
            task_id,
            file_bytes,
            target_lang,
        )

        return {
            "task_id": task_id,
            "status": "queued",
        }

    except Exception as e:
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