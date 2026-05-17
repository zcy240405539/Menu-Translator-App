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
    call_openrouter_vision_for_menu,
    call_openrouter_translate_category_labels,
)
from app.dish_cache_service import normalize_dish_name
from app.image_service import get_or_create_dish_image
from app.menu_layout_service import build_menu_items_from_layout_lines
from app.category_service import get_or_create_menu_category
from app.i18n_service import get_language_options, DEFAULT_SOURCE_LANGUAGE, DEFAULT_TARGET_LANGUAGE
from app.pdf_text_service import extract_text_from_pdf_bytes

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

def is_useful_category_translation(value, original, target_lang):
    if not value:
        return False

    value = str(value).strip()
    original = str(original or "").strip()

    if not value:
        return False

    if value == original:
        return False

    if target_lang == "zh":
        return any("\u4e00" <= ch <= "\u9fff" for ch in value)

    return True


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

    if target_lang == "zh":
        return any("\u4e00" <= ch <= "\u9fff" for ch in value)

    return True


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

def run_menu_parse_task(
    task_id: str,
    file_bytes: bytes,
    target_lang: str,
    source_lang: str = "en",
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
                ocr_blocks = extract_layout_blocks_from_image(
                    file_bytes,
                    source_lang=source_lang,
                )

                if not ocr_blocks:
                    print("OCR returned empty blocks. Falling back to OpenRouter Vision.")

                    result = call_openrouter_vision_for_menu(
                        image_bytes=file_bytes,
                        target_lang=target_lang,
                        source_lang=source_lang,
                    )

                    if not isinstance(result, dict):
                        result = {}

                    result["parser"] = "openrouter_vision"
                    result["ocr_blocks"] = []

                else:
                    result = call_openrouter_for_menu_layout(
                        ocr_blocks=ocr_blocks,
                        target_lang=target_lang,
                        source_lang=source_lang,
                    )

                    if not isinstance(result, dict):
                        result = {}

                    result["parser"] = "paddleocr_layout_openrouter"
                    result["ocr_blocks"] = ocr_blocks

            if "menu_items" not in result:
                result["menu_items"] = []

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


            # =========================
            # Menu Category Upsert
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

            missing_details = []
            if missing_items:
                
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

            # =========================
            # Final Category Sync
            # Must run AFTER dish_cache merge
            # =========================

            all_category_originals = []

            for item in enriched_items:
                section_original = (
                    item.get("section_heading_original")
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
