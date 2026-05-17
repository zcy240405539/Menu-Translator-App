import uuid
from pathlib import Path
from io import BytesIO
from PIL import Image
from fastapi import (
    BackgroundTasks,
    FastAPI,
    UploadFile,
    File,
    HTTPException,
    Depends,
)
from app.pdf_service import pdf_bytes_to_images
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from app.database import get_db, engine, Base
from app.models import DishCache, DishImage
from app.schemas import AnalyzeTextRequest, DishDetailRequest
from app.ocr_service import (
    extract_text_from_image,
    extract_layout_blocks_from_image,
)

from app.openrouter_service import (
    call_openrouter_for_dish_detail,
    call_openrouter_for_menu,
    call_openrouter_for_menu_layout,
    call_openrouter_for_missing_dish_details,
    extract_dish_candidates_from_ocr_blocks,
)
from app.dish_cache_service import normalize_dish_name
from app.image_service import get_or_create_dish_image
from app.menu_layout_service import build_menu_items_from_layout_lines
from app.category_service import get_or_create_menu_category

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
@app.head("/health")
async def health():
    return {
        "status": "ok",
        "service": "AI Menu Backend"
    }
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
        #from app.ocr_service import extract_layout_blocks_from_image
        file_bytes = await file.read()
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
    source_lang: str = "auto",
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
            content_type = MENU_TASKS[task_id].get("content_type", "") or "image/jpeg"

            if "pdf" in content_type:
                raise RuntimeError("PDF parsing is not enabled yet. Please upload an image file first.")

            source_lang = MENU_TASKS[task_id].get("source_lang", "auto")

            ocr_blocks = extract_layout_blocks_from_image(
                file_bytes,
                source_lang=source_lang,
            )

            if not ocr_blocks:
                raise RuntimeError("OCR did not detect readable text.")

            result = extract_dish_candidates_from_ocr_blocks(
                ocr_blocks,
                target_lang=target_lang,
            )
            result["ocr_blocks"] = ocr_blocks
            result["parser"] = "paddleocr_candidates_cache_first"

            if not isinstance(result, dict):
                result = {}

            if "menu_items" not in result:
                result["menu_items"] = []

            print("DEBUG OCR BLOCKS:", len(ocr_blocks))
            print("DEBUG MENU ITEMS:", len(result.get("menu_items", [])))

            layout_lines = result.get("menu_items", []) or []
            source_language = result.get("source_language") or "auto"

            # call_openrouter_for_menu_layout 已经返回 menu_items，不要再强制二次 build。
            # 否则格式不匹配时会变成空。
            menu_items = layout_lines

            for item in menu_items:
                if not item.get("source_language"):
                    item["source_language"] = source_language
            result["menu_items"] = menu_items
            result["ocr_blocks"] = ocr_blocks

            source_language = result.get("source_language")
            for item in menu_items:
                if not item.get("source_language"):
                    item["source_language"] = source_language

            enriched_items, missing_items = apply_cache_to_items(
                db=db,
                menu_items=menu_items,
                target_lang=target_lang,
            )

            if missing_items:
                missing_details = []
                batch_size = 5

                for i in range(0, len(missing_items), batch_size):
                    batch = missing_items[i:i + batch_size]

                    try:
                        batch_details = call_openrouter_for_missing_dish_details(
                            dishes=batch,
                            target_lang=target_lang,
                        )

                        if isinstance(batch_details, list):
                            missing_details.extend(batch_details)

                    except Exception as e:
                        print("Batch dish detail failed, retrying one by one:", e)

                        for single_item in batch:
                            try:
                                single_details = call_openrouter_for_missing_dish_details(
                                    dishes=[single_item],
                                    target_lang=target_lang,
                                )

                                if isinstance(single_details, list):
                                    missing_details.extend(single_details)

                            except Exception as single_error:
                                print("Single dish detail failed:", single_error)

                                # 最差情况下也返回原文，不让前端空白
                                missing_details.append({
                                    "id": single_item.get("id"),
                                    "original_name": single_item.get("original_name"),
                                    "source_language": single_item.get("source_language") or "en",
                                    "translated_name": single_item.get("original_name"),
                                    "description": "",
                                    "ingredients": [],
                                    "allergens": [],
                                    "spicy_level": 0,
                                    "image_prompt": "",
                                    "cuisine": "Other",
                                    "section_heading_translated": single_item.get("section_heading_original"),
                                })


            # =========================
            # Merge OpenRouter details back
            # =========================

            detail_map = {
                x.get("id"): x
                for x in missing_details
                if x.get("id")
            }

            final_items = []

            for item in enriched_items:
                if item.get("cache_hit"):
                    final_items.append(item)
                    continue

                detail = detail_map.get(item.get("id"))

                if detail:
                    item.update(detail)

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

            result["menu_items"] = enriched_items or menu_items
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
    source_lang: str = "auto",
):
    try:
        file_bytes = await file.read()
        content_type = file.content_type or ""

        if "pdf" in content_type:
            images = pdf_bytes_to_images(file_bytes, max_pages=5)
            if not images:
                raise Exception("PDF pages not extracted")

            # 先固定只解析第一页
            file_bytes = compress_image_bytes(images[0], max_size=1800, quality=70)
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