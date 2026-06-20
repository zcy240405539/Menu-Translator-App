import uuid
import re
import time
import os
from html import escape
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
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from app.core.database import get_db, engine, Base
from app.core.models import DishCache, DishImage, MenuCategory, User, UserCartState, UserMenuHistory, UserSubscription, UnitTranslation
from app.core.schemas import (
    SubscriptionResponse,
    AnalyzeTextRequest,
    DishDetailRequest,
    MenuUrlParseRequest,
    RecommendRequest,
    UserCartSyncRequest,
    UserMenuHistoryRequest,
    UserRegisterRequest,
    UserLoginRequest,
    GoogleLoginRequest,
    PasswordResetRequest,
    UserProfileUpdate,
    UserResponse,
)
from app.services.auth_service import (
    register_user as sb_register_user,
    login_user as sb_login_user,
    get_user_from_token as sb_get_user_from_token,
    google_login_or_register as sb_google_login_or_register,
    reset_password as sb_reset_password,
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
from app.services.category_service import get_or_create_menu_category, normalize_category_key
from app.core.i18n_service import get_language_options, DEFAULT_SOURCE_LANGUAGE, DEFAULT_TARGET_LANGUAGE
from app.services.document_text_service import (
    extract_markdown_from_file_bytes,
    extract_markdown_from_url,
    is_image_content,
    ocr_blocks_to_markdown,
    validate_public_http_url,
)
from app.services.google_translation_service import (
    translate_menu_result_with_google,
    translate_texts,
)

# 创建数据库表
Base.metadata.create_all(bind=engine)


def ensure_database_schema_compatibility():
    from app.core.database import SessionLocal
    from sqlalchemy import text
    
    db = SessionLocal()
    try:
        try:
            db.execute(text("ALTER TABLE menu_categories DROP CONSTRAINT IF EXISTS menu_categories_normalized_key_key CASCADE"))
            db.execute(text("ALTER TABLE menu_categories DROP CONSTRAINT IF EXISTS menu_categories_normalized_key_target_language_uc CASCADE"))
            db.execute(text("ALTER TABLE menu_categories DROP CONSTRAINT IF EXISTS menu_categories_normalized_key_original_label_target_lang_uc CASCADE"))
            db.execute(text("ALTER TABLE menu_categories ADD CONSTRAINT menu_categories_normalized_key_original_label_target_lang_uc UNIQUE (normalized_key, original_label, target_language)"))
            db.commit()
        except Exception as ex:
            db.rollback()
            print(f"Warning: could not alter menu_categories constraint: {ex}")
            
        try:
            db.execute(text("ALTER TABLE dish_images ADD COLUMN IF NOT EXISTS rejected_urls JSONB DEFAULT '[]'::jsonb"))
            db.commit()
        except Exception as ex:
            db.rollback()
            print(f"Warning: could not add rejected_urls to dish_images: {ex}")
    except Exception as e:
        print(f"Error ensuring database schema compatibility: {e}")
    finally:
        db.close()


ensure_database_schema_compatibility()

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


@app.get("/app-ads.txt", response_class=PlainTextResponse)
def app_ads_txt():
    for path in [Path(__file__).parent / "app-ads.txt", Path(__file__).parent.parent / "app-ads.txt"]:
        if path.exists():
            try:
                return path.read_text(encoding="utf-8")
            except Exception as e:
                print(f"Error reading app-ads.txt: {e}")
    return "google.com, pub-8286400764174465, DIRECT, f08c47fec0942fa0"


@app.get("/account-deletion", response_class=HTMLResponse)
def account_deletion_page():
    support_email = os.getenv("APP_SUPPORT_EMAIL", "support@agentscottystudio.com").strip()
    if not support_email:
        support_email = "support@agentscottystudio.com"

    safe_email = escape(support_email, quote=True)
    mail_subject = "AI%20Menu%20APP%20Account%20Deletion%20Request"
    mail_body = (
        "Please%20delete%20my%20AI%20Menu%20APP%20account.%0A%0A"
        "Registered%20email%3A%20%0A"
        "Username%20if%20known%3A%20%0A"
    )

    return HTMLResponse(
        f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Delete Account - AI Menu APP</title>
    <style>
      body {{
        margin: 0;
        font-family: Arial, Helvetica, sans-serif;
        background: #fdf8f3;
        color: #1d1b20;
        line-height: 1.6;
      }}
      main {{
        max-width: 760px;
        margin: 0 auto;
        padding: 48px 20px;
      }}
      section {{
        background: #ffffff;
        border: 1px solid #e6ded8;
        border-radius: 24px;
        padding: 28px;
      }}
      h1 {{
        margin-top: 0;
        font-size: 32px;
        line-height: 1.2;
      }}
      h2 {{
        margin-top: 28px;
        font-size: 20px;
      }}
      a.button {{
        display: inline-block;
        margin-top: 12px;
        padding: 12px 18px;
        border-radius: 999px;
        background: #6750a4;
        color: #ffffff;
        text-decoration: none;
        font-weight: 700;
      }}
      .muted {{
        color: #625b71;
      }}
    </style>
  </head>
  <body>
    <main>
      <section>
        <h1>Delete your AI Menu APP account</h1>
        <p>
          You can request deletion of your AI Menu APP account and associated
          account data at any time.
        </p>

        <h2>How to request deletion</h2>
        <ol>
          <li>Send the request from the email address registered with your account.</li>
          <li>Include your registered email and username if available.</li>
          <li>We will verify the request and process account deletion.</li>
        </ol>

        <a class="button" href="mailto:{safe_email}?subject={mail_subject}&body={mail_body}">
          Email account deletion request
        </a>

        <p class="muted">Contact email: {safe_email}</p>

        <h2>Data deleted</h2>
        <p>
          Account profile data, authentication account, avatar, saved menu
          history, profile preferences, and saved order list data associated
          with the account will be deleted where technically feasible.
        </p>

        <h2>Data that may be retained</h2>
        <p>
          We may retain security logs, transaction records required by law, and
          anonymized or non-user-linked menu, dish, and image cache data that is
          no longer associated with your account.
        </p>

        <p class="muted">
          This page is linked from Profile Settings inside the app.
        </p>
      </section>
    </main>
  </body>
</html>"""
    )


@app.get("/home/privacy-policy", response_class=HTMLResponse)
@app.get("/privacy-policy", response_class=HTMLResponse)
def privacy_policy_page():
    support_email = os.getenv("APP_SUPPORT_EMAIL", "support@agentscottystudio.com").strip()
    if not support_email:
        support_email = "support@agentscottystudio.com"

    safe_email = escape(support_email, quote=True)

    return HTMLResponse(
        f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Privacy Policy - AI Menu APP</title>
    <style>
      body {{
        margin: 0;
        font-family: Arial, Helvetica, sans-serif;
        background: #fdf8f3;
        color: #1d1b20;
        line-height: 1.65;
      }}
      main {{
        max-width: 860px;
        margin: 0 auto;
        padding: 48px 20px;
      }}
      article {{
        background: #ffffff;
        border: 1px solid #e6ded8;
        border-radius: 24px;
        padding: 30px;
      }}
      h1 {{
        margin-top: 0;
        font-size: 34px;
        line-height: 1.2;
      }}
      h2 {{
        margin-top: 30px;
        font-size: 21px;
      }}
      ul {{
        padding-left: 22px;
      }}
      a {{
        color: #6750a4;
        font-weight: 700;
      }}
      .muted {{
        color: #625b71;
      }}
    </style>
  </head>
  <body>
    <main>
      <article>
        <h1>Privacy Policy</h1>
        <p class="muted">AI Menu APP · Last updated: June 10, 2026</p>

        <p>
          AI Menu APP helps users translate and understand restaurant menus from
          photos, files, documents, and menu links. This Privacy Policy explains
          what information we collect, how we use it, and the choices available
          to users.
        </p>

        <h2>Information we collect</h2>
        <ul>
          <li>Account information, such as username, email address, optional phone number, and authentication identifiers.</li>
          <li>Profile preferences, such as dietary preferences, allergies, budget, and taste preferences when users choose to provide them.</li>
          <li>User-provided menu content, including menu photos, PDFs, documents, text, webpages, and delivery app share links.</li>
          <li>Generated menu results, including translated dish names, descriptions, ingredients, allergens, prices, menu history, and order list items.</li>
          <li>Images uploaded as avatars and images generated or retrieved to represent dishes.</li>
          <li>Technical data such as app interactions, diagnostics, device or advertising identifiers, and network request metadata.</li>
        </ul>

        <h2>How we use information</h2>
        <ul>
          <li>To provide menu OCR, translation, dish explanation, image matching, and AI recommendation features.</li>
          <li>To save account profiles, menu history, and order list data for signed-in users.</li>
          <li>To improve reliability, prevent abuse, debug errors, and maintain app security.</li>
          <li>To show advertising and measure ad performance where ads are enabled.</li>
          <li>To respond to support, account deletion, and privacy requests.</li>
        </ul>

        <h2>Third-party services</h2>
        <p>
          The app may process data through service providers used for app
          hosting, database storage, authentication, OCR, AI model responses,
          image search or generation, and advertising. These providers may
          include Render, Supabase, OpenRouter, OpenAI, Google AdMob, Pexels,
          Unsplash, Wikimedia Commons, and related infrastructure providers.
        </p>

        <h2>Advertising</h2>
        <p>
          AI Menu APP may display ads through Google AdMob. Advertising partners
          may collect or receive device identifiers, advertising identifiers,
          app interaction data, and approximate technical information to provide,
          limit, measure, and improve ads.
        </p>

        <h2>Data sharing</h2>
        <p>
          We do not sell personal information. We share information with service
          providers only as needed to operate the app, process user requests,
          provide AI and storage features, show ads, comply with legal
          obligations, or protect users and the service.
        </p>

        <h2>Data retention</h2>
        <p>
          Account data, saved preferences, menu history, and order list data may
          be retained while an account remains active. Cached dish, menu, and
          image data may be retained to improve speed and reduce repeated AI
          processing. Security logs and legal records may be retained when
          required.
        </p>

        <h2>User choices</h2>
        <ul>
          <li>Users can use the core menu translation flow without signing in.</li>
          <li>Users can choose whether to create an account, provide profile preferences, upload files, or save history.</li>
          <li>Users can request account deletion at <a href="/account-deletion">/account-deletion</a>.</li>
        </ul>

        <h2>Children</h2>
        <p>
          AI Menu APP is not designed for children. Users should not provide
          personal information for children through the app.
        </p>

        <h2>Contact</h2>
        <p>
          For privacy questions or account deletion requests, contact us at
          <a href="mailto:{safe_email}">{safe_email}</a>.
        </p>
      </article>
    </main>
  </body>
</html>"""
    )

# =========================
# Auth API Endpoints
# =========================

def to_user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role or "normal",
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


@app.get("/auth/google/url")
def get_google_auth_url(redirect_to: str = "http://localhost:19006"):
    supabase_url = os.getenv("SUPABASE_URL")
    if not supabase_url:
        raise HTTPException(status_code=500, detail="SUPABASE_URL not configured")
    url = f"{supabase_url}/auth/v1/authorize?provider=google&redirect_to={redirect_to}"
    return {"url": url}


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


@app.post("/user/menu-history")
def save_user_menu_history(
    request: UserMenuHistoryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        menu_result = request.menu_result or {}
        menu_hash = menu_result.get("image_hash") or menu_result.get("hash")
        target_language = request.target_lang or menu_result.get("target_language")

        history_record = None
        if menu_hash:
            history_record = (
                db.query(UserMenuHistory)
                .filter(
                    UserMenuHistory.user_id == current_user.id,
                    UserMenuHistory.menu_hash == menu_hash,
                    UserMenuHistory.target_language == target_language,
                )
                .first()
            )

        if not history_record:
            history_record = UserMenuHistory(user_id=current_user.id)
            db.add(history_record)

        history_record.menu_hash = menu_hash
        history_record.source_uri = request.source_uri
        history_record.target_language = target_language
        history_record.source_language = menu_result.get("source_language")
        history_record.business_name = menu_result.get("business_name")
        history_record.restaurant_type = menu_result.get("restaurant_type")
        history_record.currency = menu_result.get("currency")
        history_record.menu_result = menu_result

        db.commit()
        db.refresh(history_record)

        return {
            "id": history_record.id,
            "saved": True,
            "menu_hash": history_record.menu_hash,
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/user/cart")
def get_user_cart(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    state = db.query(UserCartState).filter(UserCartState.user_id == current_user.id).first()
    return {
        "items": state.items if state else [],
        "updated_at": state.updated_at.isoformat() if state and state.updated_at else None,
    }


@app.put("/user/cart")
def update_user_cart(
    request: UserCartSyncRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        state = db.query(UserCartState).filter(UserCartState.user_id == current_user.id).first()

        if not state:
            state = UserCartState(user_id=current_user.id, items=request.items or [])
            db.add(state)
        else:
            state.items = request.items or []

        db.commit()
        db.refresh(state)

        return {
            "items": state.items or [],
            "updated_at": state.updated_at.isoformat() if state.updated_at else None,
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/auth/logout")
def logout_user():
    return {"status": "success"}

@app.post("/auth/password-reset")
def password_reset(request: PasswordResetRequest):
    try:
        sb_reset_password(request.email)
        return {"status": "email sent"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    from fastapi.responses import JSONResponse
    import logging
    logger = logging.getLogger("uvicorn.error")
    logger.exception("Unhandled exception in API request: %s", str(exc))
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"},
    )


def is_render_runtime() -> bool:
    return bool(
        os.getenv("RENDER")
        or os.getenv("RENDER_SERVICE_ID")
        or os.getenv("RENDER_EXTERNAL_URL")
    )


def get_requested_ocr_provider(ocr_provider: str | None = None) -> str:
    return (ocr_provider or os.getenv("OCR_PROVIDER", "") or "").strip().lower()


def should_use_google_vision_ocr(ocr_provider: str | None = None) -> bool:
    provider = get_requested_ocr_provider(ocr_provider)
    return provider in {"google_vision", "cloud_vision", "google-cloud-vision", "google"}


def should_use_vision_ocr(ocr_provider: str | None = None) -> bool:
    provider = get_requested_ocr_provider(ocr_provider)

    if provider in {"vision", "openrouter", "cloud"}:
        return True

    if provider in {"paddle", "local", "paddleocr"}:
        return False

    return is_render_runtime()


def load_local_ocr_functions():
    from app.services.ocr_service import extract_layout_blocks_from_image, extract_text_from_image

    return extract_layout_blocks_from_image, extract_text_from_image


def is_price_segment(text: str) -> bool:
    t = text.strip()
    if not t:
        return False
    t_clean = re.sub(r"\s+", "", t)
    
    # Contains a number
    if not re.search(r"\d", t):
        return False
        
    # Just a number (possibly with decimal and currency prefix/suffix)
    if re.match(r"^[￥¥$€£]?\d+(?:\.\d+)?[元块刀]?$", t_clean):
        return True
        
    # Ends with common currency units or measure words
    price_units = r"(元|块|刀|usd|cny|eur|gbp|each|serving|pcs|份|位|人|只|隻|条|條|碗|盘|盤|杯|瓶|斤|两|兩|pot|basin|bowl|plate|cup|bottle|jin|liang|porción|tazón|pieza|taza|botella|plato|persona|gl|glass|oz|ml|l)"
    if re.search(price_units + r"\s*$", t.lower()):
        return True
        
    # Contains a slash followed by a unit (e.g. /份, /serving, /each)
    if re.search(r"/\s*\w+", t) or re.search(r"/\s*[\u4e00-\u9fa5]", t):
        return True
        
    # Starts with size keywords and contains number
    size_keywords = r"^(大份|小份|中份|大|小|中|large|medium|small|lg|md|sm|regular|reg|double|single|slice|each|per)"
    if re.search(size_keywords, t.lower()):
        return True
        
    # Contains common option structure like "12in: 13", "12": 13"
    if re.search(r"\w+in\s*:\s*\d+", t.lower()) or re.search(r"\d+in\s*:\s*\d+", t.lower()):
        return True

    return False


def split_joined_line(text: str) -> list[str]:
    segments = [s.strip() for s in text.split("|")]
    segments = [s for s in segments if s]
    if not segments:
        return []
        
    items = []
    current_item = []
    has_price = False
    
    for seg in segments:
        is_pr = is_price_segment(seg)
        if is_pr:
            current_item.append(seg)
            has_price = True
        else:
            if has_price:
                items.append(" | ".join(current_item))
                current_item = [seg]
                has_price = False
            else:
                current_item.append(seg)
                
    if current_item:
        items.append(" | ".join(current_item))
        
    return items


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
        
        split_items = split_joined_line(combined_text)
        N = len(split_items)
        
        if N > 1:
            total_width = 100.0
            sub_width = total_width / N
            for k, split_text in enumerate(split_items):
                x_start = x * 100 + k * sub_width
                x_end = x_start + sub_width
                blocks.append({
                    "text": split_text,
                    "line_role": role,
                    "x_min": x_start,
                    "y_min": y * 40,
                    "x_max": x_end,
                    "y_max": y * 40 + 20,
                    "center_x": x_start + sub_width / 2.0,
                    "center_y": y * 40 + 10,
                    "confidence": 0.9,
                    "ocr_lang": "openrouter_vision",
                })
        else:
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
    ocr_provider: str | None = None,
) -> tuple[dict, list[dict]]:
    if should_use_google_vision_ocr(ocr_provider):
        from app.services.google_vision_service import extract_layout_blocks_from_image_with_google_vision

        ocr_blocks = extract_layout_blocks_from_image_with_google_vision(
            image_bytes=file_bytes,
            mime_type=mime_type,
        )
        vision_result = {}
        parser_prefix = "google_cloud_vision"
    else:
        vision_result = call_openrouter_vision_for_menu(
            image_bytes=file_bytes,
            mime_type=mime_type,
            target_lang=target_lang,
            source_lang=source_lang,
        )
        ocr_blocks = vision_layout_to_ocr_blocks(vision_result)
        parser_prefix = "openrouter_vision"

    if not ocr_blocks:
        return {
            "source_language": vision_result.get("source_language") or source_lang,
            "target_language": target_lang,
            "restaurant_type": vision_result.get("restaurant_type"),
            "menu_items": [],
            "menu_pricing": vision_result.get("menu_pricing") or [],
            "parser": f"{parser_prefix}_empty",
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

    if vision_result.get("business_name") and not result.get("business_name"):
        result["business_name"] = vision_result["business_name"]

    if vision_result.get("currency") and not result.get("currency"):
        result["currency"] = vision_result["currency"]

    result["parser"] = result.get("parser") or f"{parser_prefix}_layout_openrouter"
    result["ocr_blocks"] = ocr_blocks

    return result, ocr_blocks


def extract_image_markdown_for_analysis(
    file_bytes: bytes,
    source_lang: str,
    target_lang: str,
    mime_type: str = "image/jpeg",
    ocr_provider: str | None = None,
) -> tuple[str, list[dict], str]:
    if should_use_google_vision_ocr(ocr_provider):
        from app.services.google_vision_service import extract_layout_blocks_from_image_with_google_vision

        ocr_blocks = extract_layout_blocks_from_image_with_google_vision(
            image_bytes=file_bytes,
            mime_type=mime_type or "image/jpeg",
        )
        return (
            ocr_blocks_to_markdown(ocr_blocks, source_label="google_cloud_vision_ocr"),
            ocr_blocks,
            "image_google_cloud_vision_ocr_markdown_openrouter",
        )

    if should_use_vision_ocr(ocr_provider):
        vision_result = call_openrouter_vision_for_menu(
            image_bytes=file_bytes,
            mime_type=mime_type or "image/jpeg",
            target_lang=target_lang,
            source_lang=source_lang,
        )
        ocr_blocks = vision_layout_to_ocr_blocks(vision_result)
        return (
            ocr_blocks_to_markdown(ocr_blocks, source_label="openrouter_vision_ocr"),
            ocr_blocks,
            "image_vision_ocr_markdown_openrouter",
        )

    extract_layout_blocks_from_image, _ = load_local_ocr_functions()
    ocr_blocks = extract_layout_blocks_from_image(
        file_bytes,
        source_lang=source_lang,
    )

    if not ocr_blocks:
        print("OCR returned empty blocks. Falling back to OpenRouter Vision.")
        vision_result = call_openrouter_vision_for_menu(
            image_bytes=file_bytes,
            mime_type=mime_type or "image/jpeg",
            target_lang=target_lang,
            source_lang=source_lang,
        )
        ocr_blocks = vision_layout_to_ocr_blocks(vision_result)
        return (
            ocr_blocks_to_markdown(ocr_blocks, source_label="openrouter_vision_ocr_fallback"),
            ocr_blocks,
            "image_vision_ocr_markdown_fallback_openrouter",
        )

    return (
        ocr_blocks_to_markdown(ocr_blocks, source_label="paddleocr"),
        ocr_blocks,
        "image_paddleocr_markdown_openrouter",
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
    result["currency"] = record.currency
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
    ocr_provider: Optional[str] = None,
):
    try:
        file_bytes = await file.read()
        if should_use_google_vision_ocr(ocr_provider):
            from app.services.google_vision_service import call_google_vision_text_detection

            vision_result = call_google_vision_text_detection(
                image_bytes=file_bytes,
                mime_type=file.content_type or "image/jpeg",
            )
            blocks = vision_result.get("blocks") or []
            ocr_text = vision_result.get("text") or "\n".join(b["text"] for b in blocks if b.get("text"))
        elif should_use_vision_ocr(ocr_provider):
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
    ocr_provider: Optional[str] = None,
):
    try:
        file_bytes = await file.read()
        if should_use_google_vision_ocr(ocr_provider):
            from app.services.google_vision_service import extract_layout_blocks_from_image_with_google_vision

            blocks = extract_layout_blocks_from_image_with_google_vision(
                image_bytes=file_bytes,
                mime_type=file.content_type or "image/jpeg",
            )
        elif should_use_vision_ocr(ocr_provider):
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
        result = translate_menu_result_with_google(
            result,
            target_lang=request.target_lang,
            source_lang=result.get("source_language") or getattr(request, "source_lang", "en") if isinstance(result, dict) else getattr(request, "source_lang", "en"),
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
    ocr_provider: Optional[str] = None,
    document_provider: Optional[str] = None,
):
    try:
        file_bytes = await file.read()
        mime_type = file.content_type or "application/octet-stream"
        file_name = file.filename or "menu"

        if is_image_content(mime_type, file_name):
            extracted_markdown, ocr_blocks, parser_name = extract_image_markdown_for_analysis(
                file_bytes=file_bytes,
                source_lang=source_lang,
                target_lang=target_lang,
                mime_type=mime_type,
                ocr_provider=ocr_provider,
            )
        else:
            extracted_markdown = extract_markdown_from_file_bytes(
                file_bytes=file_bytes,
                filename=file_name,
                content_type=mime_type,
                target_lang=target_lang,
                source_lang=source_lang,
                document_provider=document_provider,
            )
            ocr_blocks = []
            parser_name = "document_markitdown_openrouter"

        if not extracted_markdown:
            raise HTTPException(status_code=422, detail="No readable menu text was extracted.")

        result = call_openrouter_for_menu(
            ocr_text=extracted_markdown,
            target_lang=target_lang,
            source_lang=source_lang,
        )
        result = translate_menu_result_with_google(
            result,
            target_lang=target_lang,
            source_lang=result.get("source_language") or source_lang if isinstance(result, dict) else source_lang,
        )

        if not isinstance(result, dict):
            result = {}

        result["ocr_blocks"] = ocr_blocks or [
            {
                "type": "markitdown",
                "text": extracted_markdown,
                "file_name": file_name,
            }
        ]
        result["parser"] = parser_name
        result["ocr_provider"] = ocr_provider or get_requested_ocr_provider() or "auto"
        result["document_provider"] = document_provider or os.getenv("DOCUMENT_TEXT_PROVIDER", "auto")
        result["extracted_text_format"] = "markdown"
        result["extracted_text_preview"] = extracted_markdown[:12000]
        result["source_lang_request"] = source_lang

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/menus/parse/url")
async def parse_menu_url(
    request: MenuUrlParseRequest,
    document_provider: Optional[str] = None,
):
    try:
        safe_url = validate_public_http_url(request.url)
        extracted_markdown = extract_markdown_from_url(
            safe_url,
            target_lang=request.target_lang,
            source_lang=request.source_lang,
            document_provider=document_provider,
        )

        if not extracted_markdown:
            raise HTTPException(status_code=422, detail="No readable menu text was extracted.")

        result = call_openrouter_for_menu(
            ocr_text=extracted_markdown,
            target_lang=request.target_lang,
            source_lang=request.source_lang,
        )
        result = translate_menu_result_with_google(
            result,
            target_lang=request.target_lang,
            source_lang=result.get("source_language") or request.source_lang if isinstance(result, dict) else request.source_lang,
        )

        if not isinstance(result, dict):
            result = {}

        result["ocr_blocks"] = [
            {
                "type": "markitdown",
                "text": extracted_markdown,
                "source_url": safe_url,
            }
        ]
        result["parser"] = "url_markitdown_openrouter"
        result["document_provider"] = document_provider or os.getenv("DOCUMENT_TEXT_PROVIDER", "auto")
        result["source_url"] = safe_url
        result["extracted_text_format"] = "markdown"
        result["extracted_text_preview"] = extracted_markdown[:12000]
        result["source_lang_request"] = request.source_lang

        return result

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
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
        rejected_urls = []

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

            if cached_image:
                rejected_list = list(cached_image.rejected_urls or [])
                if request.refresh_image and request.reject_image_url:
                    if request.reject_image_url not in rejected_list:
                        rejected_list.append(request.reject_image_url)
                        cached_image.rejected_urls = rejected_list
                        db.commit()
                rejected_urls = rejected_list

        force_refresh = bool(request.refresh_image)

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

            image_url = cached_image.image_url if (cached_image and not force_refresh) else None
            if image_url and image_url in rejected_urls:
                image_url = None
                force_refresh = True

            thumbnail_url = cached_image.thumbnail_url if (cached_image and not force_refresh) else None
            image_source = cached_image.source_type if (cached_image and not force_refresh) else None

            if not image_url:
                image_url = get_or_create_dish_image(
                    db=db,
                    dish=dish_payload,
                    normalized_name=normalized_name,
                    force_refresh=True,
                    rejected_urls=rejected_urls,
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
            curr_cached_image = db.query(DishImage).filter(DishImage.normalized_name == normalized_name).first()
            curr_url = curr_cached_image.image_url if curr_cached_image else None
            if force_refresh or (curr_url and curr_url in rejected_urls):
                image_url = get_or_create_dish_image(
                    db=db,
                    dish=dish_payload,
                    normalized_name=normalized_name,
                    force_refresh=True,
                    rejected_urls=rejected_urls,
                )
            else:
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

def compress_image_bytes(file_bytes: bytes, max_size: int = None, quality: int = None) -> bytes:
    try:
        if max_size is None:
            max_size = int(os.getenv("MENU_IMAGE_MAX_SIZE", "1280"))
        if quality is None:
            quality = int(os.getenv("MENU_IMAGE_JPEG_QUALITY", "68"))

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


def collect_existing_category_translation_map(db, labels, target_lang):
    category_map = {}
    normalized_labels = []

    for label in labels:
        normalized_labels.append((label, normalize_category_key(label)))

    if not normalized_labels:
        return category_map

    keys = list({key for _, key in normalized_labels})
    records = (
        db.query(MenuCategory)
        .filter(
            MenuCategory.target_language == target_lang,
            MenuCategory.normalized_key.in_(keys),
        )
        .all()
    )

    exact_records = {
        (record.normalized_key, record.original_label): record
        for record in records
    }
    fallback_records = {}
    for record in records:
        fallback_records.setdefault(record.normalized_key, record)

    for label, key in normalized_labels:
        record = exact_records.get((key, label)) or fallback_records.get(key)
        if not record:
            continue

        if is_useful_category_translation(record.translated_label, label, target_lang):
            category_map[label] = record.translated_label

    return category_map


def resolve_category_translation_map(db, labels, target_lang, source_lang, seed_map=None):
    category_map = dict(seed_map or {})
    category_map.update(collect_existing_category_translation_map(db, labels, target_lang))

    missing_labels = [
        label
        for label in labels
        if not is_useful_category_translation(category_map.get(label), label, target_lang)
    ]

    if missing_labels:
        try:
            translated_texts = translate_texts(
                texts=missing_labels,
                target_lang=target_lang,
                source_lang=source_lang,
            )
            translated_categories = {
                label: translated_texts.get(label)
                for label in missing_labels
                if translated_texts.get(label)
            }

            for label, translated in translated_categories.items():
                if is_useful_category_translation(translated, label, target_lang):
                    category_map[label] = translated

        except Exception as category_translate_error:
            print("Google category translation failed:", category_translate_error)

        still_missing_labels = [
            label
            for label in labels
            if not is_useful_category_translation(category_map.get(label), label, target_lang)
        ]

        if still_missing_labels:
            try:
                translated_categories = call_openrouter_translate_category_labels(
                    labels=still_missing_labels,
                    target_lang=target_lang,
                    source_lang=source_lang,
                )

                for label, translated in translated_categories.items():
                    if is_useful_category_translation(translated, label, target_lang):
                        category_map[label] = translated

            except Exception as category_translate_error:
                print("Fallback category translation failed:", category_translate_error)

    return category_map


def apply_category_records_to_items(db, items, target_lang, source_lang, seed_map=None):
    labels = []
    for item in items or []:
        section_original = (
            item.get("section_heading_original")
            or item.get("category")
            or "Other"
        )
        if section_original not in labels:
            labels.append(section_original)

    category_map = resolve_category_translation_map(
        db=db,
        labels=labels,
        target_lang=target_lang,
        source_lang=source_lang,
        seed_map=seed_map,
    )

    for item in items or []:
        section_original = (
            item.get("section_heading_original")
            or item.get("category")
            or "Other"
        )
        section_translated = (
            category_map.get(section_original)
            or item.get("section_heading_translated")
            or section_original
        )

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

    return items or []


# =========================
# Async Tasks
# =========================

MENU_TASKS = {}
MENU_CACHE_SCHEMA_VERSION = 9
MENU_PARSE_INITIAL_DETAIL_LIMIT = int(os.getenv("MENU_PARSE_INITIAL_DETAIL_LIMIT", "0"))

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

        task = MENU_TASKS[task_id]
        content_type = task.get("content_type", "") or "image/jpeg"
        source_lang = task.get("source_lang", source_lang) or "en"
        file_name = task.get("file_name") or "menu"
        source_url = task.get("source_url")
        ocr_provider = task.get("ocr_provider")
        document_provider = task.get("document_provider")

        cache_material = file_bytes + (
            f"|schema={MENU_CACHE_SCHEMA_VERSION}"
            f"|ocr={ocr_provider or ''}"
            f"|document={document_provider or ''}"
        ).encode("utf-8")
        image_hash = calculate_image_hash(cache_material)
        print("Calculated image_hash:", image_hash)
        db = SessionLocal()

        try:
            cached_menu = get_menu_cache(db, image_hash, target_lang)

            if cached_menu:
                result = cached_menu.structure_result or {}
                result["menu_items"] = cached_menu.menu_items or []
                result["ocr_blocks"] = cached_menu.ocr_blocks or []
                result["business_name"] = cached_menu.business_name
                result["currency"] = cached_menu.currency
                result["business_description"] = cached_menu.business_description or {}
                result["image_hash"] = image_hash

                if result.get("cache_schema_version") != MENU_CACHE_SCHEMA_VERSION:
                    print("Menu cache skipped because cache schema version changed.")
                elif any(needs_dish_language_enrichment(item, target_lang) for item in result["menu_items"]):
                    print("Menu cache skipped because translated fields need refresh.")
                else:
                    try:
                        result["menu_items"] = apply_category_records_to_items(
                            db=db,
                            items=result.get("menu_items") or [],
                            target_lang=target_lang,
                            source_lang=result.get("source_language") or source_lang,
                            seed_map=collect_category_translation_map(result.get("menu_items") or [], target_lang),
                        )
                    except Exception as category_error:
                        print("Cached menu category sync failed:", category_error)

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
            ocr_blocks = []
            extraction_started_at = time.perf_counter()

            if source_url:
                print("URL detected. Extracting Markdown with MarkItDown:", source_url)
                extracted_markdown = extract_markdown_from_url(
                    source_url,
                    target_lang=target_lang,
                    source_lang=source_lang,
                    document_provider=document_provider,
                )
                parser_name = "url_markitdown_openrouter"

            elif is_image_content(content_type, file_name):
                print("Image detected. Extracting OCR Markdown.")
                extracted_markdown, ocr_blocks, parser_name = extract_image_markdown_for_analysis(
                    file_bytes=file_bytes,
                    source_lang=source_lang,
                    target_lang=target_lang,
                    mime_type=content_type or "image/jpeg",
                    ocr_provider=ocr_provider,
                )

            else:
                print("Document detected. Extracting Markdown with MarkItDown:", file_name, content_type)
                extracted_markdown = extract_markdown_from_file_bytes(
                    file_bytes=file_bytes,
                    filename=file_name,
                    content_type=content_type,
                    target_lang=target_lang,
                    source_lang=source_lang,
                    document_provider=document_provider,
                )
                parser_name = "document_markitdown_openrouter"

            timings["extraction_seconds"] = round(time.perf_counter() - extraction_started_at, 3)

            if not extracted_markdown:
                raise ValueError("No readable menu text was extracted.")

            analysis_started_at = time.perf_counter()
            result = call_openrouter_for_menu(
                ocr_text=extracted_markdown,
                target_lang=target_lang,
                source_lang=source_lang,
            )
            result = translate_menu_result_with_google(
                result,
                target_lang=target_lang,
                source_lang=result.get("source_language") or source_lang if isinstance(result, dict) else source_lang,
            )
            timings["analysis_seconds"] = round(time.perf_counter() - analysis_started_at, 3)

            if not isinstance(result, dict):
                result = {}

            result["parser"] = parser_name
            result["ocr_provider"] = ocr_provider or get_requested_ocr_provider() or "auto"
            result["document_provider"] = document_provider or os.getenv("DOCUMENT_TEXT_PROVIDER", "auto")
            result["extracted_text_format"] = "markdown"
            result["extracted_text_preview"] = extracted_markdown[:12000]
            if source_url:
                result["source_url"] = source_url
            result["ocr_blocks"] = ocr_blocks or [
                {
                    "type": "markitdown",
                    "text": extracted_markdown,
                    "source_url": source_url,
                    "file_name": file_name,
                }
            ]

            if "menu_items" not in result:
                result["menu_items"] = []

            if "business_name" not in result:
                result["business_name"] = None

            if "currency" not in result:
                result["currency"] = None

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

            skipped_initial_detail_count = 0
            if MENU_PARSE_INITIAL_DETAIL_LIMIT >= 0 and len(missing_items) > MENU_PARSE_INITIAL_DETAIL_LIMIT:
                skipped_initial_detail_count = len(missing_items) - MENU_PARSE_INITIAL_DETAIL_LIMIT
                missing_items = missing_items[:MENU_PARSE_INITIAL_DETAIL_LIMIT]

            print("DEBUG MISSING DETAIL ITEMS:", len(missing_items))
            if skipped_initial_detail_count:
                print("DEBUG SKIPPED INITIAL DETAIL ITEMS:", skipped_initial_detail_count)
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
            dish_cache_changed = False

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
                            commit=False,
                        )
                        dish_cache_changed = True
                    except Exception as cache_error:
                        db.rollback()
                        dish_cache_changed = False
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

                # 不管 OpenRouter 成功失败，都写入数据库
                try:
                    upsert_dish_cache(
                        db=db,
                        dish=item,
                        target_lang=target_lang,
                        commit=False,
                    )
                    dish_cache_changed = True
                except Exception as cache_error:
                    db.rollback()
                    dish_cache_changed = False
                    print("Dish cache upsert failed:", cache_error)

                final_items.append(item)

            if dish_cache_changed:
                try:
                    db.commit()
                except Exception as cache_commit_error:
                    db.rollback()
                    print("Dish cache batch commit failed:", cache_commit_error)

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

            category_translation_map = resolve_category_translation_map(
                db=db,
                labels=all_category_originals,
                target_lang=target_lang,
                source_lang=source_lang,
                seed_map=category_translation_map,
            )

            category_records_changed = False
            for item in enriched_items:
                original_category = original_category_by_id.get(item.get("id"), {})
                section_original = (
                    original_category.get("section_heading_original")
                    or item.get("section_heading_original")
                    or original_category.get("category")
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
                        commit=False,
                    )
                    category_records_changed = True

                    item["category_id"] = category_record.id
                    item["category_key"] = category_record.normalized_key
                    item["category_display_name"] = category_record.translated_label
                    item["section_heading_original"] = category_record.original_label
                    item["section_heading_translated"] = category_record.translated_label

                except Exception as category_error:
                    db.rollback()
                    category_records_changed = False
                    print("Final category upsert failed:", category_error)

            if category_records_changed:
                try:
                    db.flush()
                except Exception as category_flush_error:
                    db.rollback()
                    print("Final category batch flush failed:", category_flush_error)


            result["menu_items"] = enriched_items or menu_items
            result["ocr_blocks"] = result.get("ocr_blocks", ocr_blocks)
            result["image_hash"] = image_hash
            result["cache_summary"] = {
                "menu_cache_hit": False,
                "total_items": len(enriched_items),
                "dish_cache_hits": len([x for x in enriched_items if x.get("cache_hit")]),
                "dish_cache_misses": len([x for x in enriched_items if not x.get("cache_hit")]),
                "initial_detail_limit": MENU_PARSE_INITIAL_DETAIL_LIMIT,
                "initial_detail_skipped": skipped_initial_detail_count,
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
    file: Optional[UploadFile] = File(None),
    target_lang: str = "zh",
    source_lang: str = "auto",
    ocr_provider: Optional[str] = None,
    document_provider: Optional[str] = None,
):
    try:
        if not file:
            raise HTTPException(status_code=400, detail="No menu file uploaded")

        file_bytes = await file.read()
        content_type = file.content_type or ""
        file_name = file.filename or "menu"

        if is_image_content(content_type, file_name):
            file_bytes = compress_image_bytes(file_bytes)
            content_type = "image/jpeg"

        task_id = str(uuid.uuid4())

        MENU_TASKS[task_id] = {
            "status": "queued",
            "result": None,
            "error": None,
            "content_type": content_type,
            "file_name": file_name,
            "source_lang": source_lang,
            "ocr_provider": ocr_provider,
            "document_provider": document_provider,
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

    except HTTPException:
        raise

    except Exception as e:
        print("Start parse failed:", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/menus/parse/url/start")
async def start_parse_menu_url(
    request: MenuUrlParseRequest,
    background_tasks: BackgroundTasks,
    document_provider: Optional[str] = None,
):
    try:
        safe_url = validate_public_http_url(request.url)
        task_id = str(uuid.uuid4())
        url_bytes = safe_url.encode("utf-8")

        MENU_TASKS[task_id] = {
            "status": "queued",
            "result": None,
            "error": None,
            "content_type": "text/html",
            "file_name": "menu-url.html",
            "source_lang": request.source_lang,
            "source_url": safe_url,
            "document_provider": document_provider,
        }

        background_tasks.add_task(
            run_menu_parse_task,
            task_id,
            url_bytes,
            request.target_lang,
            request.source_lang,
        )

        return {
            "task_id": task_id,
            "status": "queued",
        }

    except ValueError as e:
        print("Start URL parse rejected:", e)
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        print("Start URL parse failed:", e)
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


@app.get("/i18n/units")
def get_unit_translations(db: Session = Depends(get_db)):
    translations = db.query(UnitTranslation).all()
    return [
        {
            "source_unit": t.source_unit,
            "target_lang": t.target_lang,
            "translated_unit": t.translated_unit
        }
        for t in translations
    ]


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
