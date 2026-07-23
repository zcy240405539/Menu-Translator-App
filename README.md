# AI Menu Translator & Food Analyzer

An AI-powered multilingual restaurant menu translation and food analysis system built with FastAPI, React Native (Expo), Google Document AI / Cloud Vision, Google Cloud Translation, Gemini, OpenRouter, and local OCR fallback.

Users can:
- Scan restaurant menu images and PDFs
- Translate menus between English, simplified Chinese, traditional Chinese, and Spanish
- View AI-generated dish descriptions
- Browse web-sourced or AI-generated food images
- Get AI ordering recommendations based on party size, budget, diet, allergies, and taste
- Sign in, manage profile preferences, save history, build an order list, and share cached menu results
- Cache dish knowledge for lower AI costs and faster responses

---

# Features

- Source-language routed menu OCR
- AI-powered menu layout reconstruction and parsing with language-specific modules
- English, simplified Chinese, traditional Chinese, and Spanish translation support
- Google Cloud Translation v3 support
- Dish detail generation
- Dish image search with Pexels, Unsplash, Wikimedia Commons, and OpenAI image fallback
- PostgreSQL dish, category, and menu parse cache
- Supabase Auth user accounts, profile preferences, avatars, and subscription records
- AI recommendation module
- Shareable cached menu URLs
- Native ad plumbing with web-safe fallbacks
- Context-aware price and currency formatting
- Smart token-saving architecture
- React Native mobile app
- FastAPI backend

---

# Tech Stack
## Frontend
- React Native
- Expo
- React Native Paper
- AsyncStorage
- React Native Google Mobile Ads
- Next.js web frontend in `frontend-web/`
- Tailwind CSS
- Google AdSense

## Backend
- FastAPI
- Google Document AI
- Google Cloud Vision
- Google Cloud Translation v3
- Gemini API
- OpenRouter API
- PaddleOCR fallback
- SQLAlchemy
- Supabase Python client
- PyMuPDF

## Database
- PostgreSQL
- Supabase Auth
- Supabase Storage

## Image Storage
- Supabase Storage
- Pexels image search
- Unsplash image search
- Wikimedia Commons image search
- OpenAI generated-image fallback

---

# Architecture

```text
User Upload
    ↓
Image / PDF / URL / document / text normalization
    ↓
Google Document AI / Cloud Vision / OpenRouter Vision / local OCR fallback
    ↓
Source-language detection
    ↓
Language module routing: backend/app/language_modules/{en,zh,es}
    ↓
Gemini or OpenRouter menu structure parsing
    ↓
Google Cloud Translation v3
    ↓
PostgreSQL menu, dish, and category cache
    ↓
Missing dish enrichment
    ↓
Image search / generated image fallback
    ↓
Supabase Storage
    ↓
Frontend rendering, sharing, recommendation, cart, and history
```

## Local Agent Handoff Docs

`AGENT.md` and `ARCHITECTURE.md` are local, gitignored AI-agent handoff files. Agents should update `AGENT.md` after each project task and check whether `README.md` also needs a committed update.

## APP Structure
```
menu-translator-app/
├─ README.md
├─ LICENSE
├─ backend/
│  ├─ app/
│  │  ├─ main.py
│  │  ├─ core/
│  │  │  ├─ config.py
│  │  │  ├─ database.py
│  │  │  ├─ i18n_service.py
│  │  │  ├─ models.py
│  │  │  └─ schemas.py
│  │  ├─ language_modules/
│  │  │  ├─ en/
│  │  │  ├─ es/
│  │  │  └─ zh/
│  │  └─ services/
│  │     ├─ auth_service.py
│  │     ├─ app_config_service.py
│  │     ├─ category_service.py
│  │     ├─ dish_cache_service.py
│  │     ├─ document_text_service.py
│  │     ├─ gemini_menu_service.py
│  │     ├─ google_document_ai_service.py
│  │     ├─ google_translation_service.py
│  │     ├─ google_vision_service.py
│  │     ├─ image_service.py
│  │     ├─ menu_cache_service.py
│  │     ├─ menu_layout_service.py
│  │     ├─ ocr_service.py
│  │     ├─ openrouter_service.py
│  │     ├─ pdf_service.py
│  │     └─ pdf_text_service.py
│  ├─ static/
│  │  ├─ README/
│  │  ├─ dish_images/
│  │  └─ generated_images/
│  ├─ migrations/
│  ├─ uploads/
│  ├─ .env
│  └─ requirements.txt
└─ frontend/
   ├─ App.js
   ├─ app.config.js
   ├─ api.js
   ├─ i18n.js
   ├─ screens/
   │  ├─ HomeScreen.js
   │  ├─ CartScreen.js
   │  ├─ HistoryScreen.js
   │  └─ MenuResultScreen.js
   ├─ storage/
   │  ├─ cartStorage.js
   │  └─ menuStorage.js
   ├─ utils/
   │  ├─ ads.native.js
   │  ├─ ads.web.js
   │  └─ price.js
   └─ components/
      ├─ AccountProfileModal.js
      ├─ AIRecommendModal.js
      ├─ DishDetailModal.js
      ├─ LoginRegisterModal.js
      └─ ShareDialog.js
└─ frontend-web/
   ├─ src/
   │  ├─ app/
   │  │  ├─ page.tsx
   │  │  ├─ cart/
   │  │  ├─ history/
   │  │  ├─ login/
   │  │  ├─ privacy-policy/
   │  │  └─ account-deletion/
   │  └─ components/
   │     ├─ MenuAnalyzer.tsx
   │     └─ ads/
   ├─ public/
   │  └─ ads.txt
   └─ package.json
```

# Screenshots
![alt text](/backend/static/README/image-1.png)


# Installation


# Backend Setup
## Install dependencies
```pip install -r requirements.txt```

## Create .env
```
OPENROUTER_API_KEY=your_key
DATABASE_URL=postgresql://postgres:password@localhost:5432/menu_app
BACKEND_BASE_URL=http://127.0.0.1:8000
```

## Run backend
```
uvicorn app.main:app --reload
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

# Frontend Setup
```
npm install
npx expo start -c
```

# Web Frontend Setup
```
cd frontend-web
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_URL` to the FastAPI backend base URL. For local development, use `http://127.0.0.1:8000`.

For Render Static Site deployment:

```text
Root Directory: frontend-web
Build Command: npm ci && npm run build
Publish Directory: out
```

# Environment Variables
```
OPENROUTER_API_KEY=XXXXXXX
OPENROUTER_MODEL=google/gemini-2.5-flash-lite
OPENROUTER_LAYOUT_MODEL=google/gemini-2.5-flash-lite
OPENROUTER_DETAIL_MODEL=google/gemini-2.5-flash-lite
OPENROUTER_USE_FAST_MENU_PROMPT=true
OPENROUTER_LAYOUT_TIMEOUT=45
OPENROUTER_MAX_RETRIES=2
OPENROUTER_VISION_MODEL=google/gemini-2.5-flash-lite
OPENROUTER_VISION_FALLBACK_MODELS=google/gemini-2.5-flash,google/gemini-2.5-flash-lite
GEMINI_API_KEY=XXXXXXX
GEMINI_MODEL=gemini-2.5-flash-lite
GEMINI_MENU_STRUCTURE_MODEL=gemini-2.5-flash-lite
LAYOUT_MAX_TOKENS=6500
VISION_MAX_TOKENS=4000
GOOGLE_CLOUD_API=XXXXXXX
GOOGLE_CLOUD_PROJECT_ID=XXXXXXX
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account", "...":"..."}
GOOGLE_DOCUMENT_AI_LOCATION=us
GOOGLE_DOCUMENT_AI_PROCESSOR_ID=XXXXXXX
GOOGLE_CLOUD_LOCATION=global
GOOGLE_CLOUD_TRANSLATION_GLOSSARY_ID=optional
GOOGLE_CLOUD_TRANSLATION_MODEL=optional
GOOGLE_CLOUD_TRANSLATION_WORKERS=4
DATABASE_URL=XXXXXXX
SUPABASE_URL=https://XXXXXX.supabase.co
SUPABASE_SERVICE_ROLE_KEY=XXXXXX
SUPABASE_BUCKET=Dish_Images
OCR_PROVIDER=auto
DOCUMENT_TEXT_PROVIDER=auto
OCR_AUTO_LANG_ORDER=en,ch
OCR_AUTO_MODE=fast
OCR_FAST_AUTO_MIN_SCORE=58
OCR_MAX_IMAGE_WIDTH=1600
OCR_MAX_IMAGE_HEIGHT=2400
MENU_IMAGE_MAX_SIZE=1280
MENU_IMAGE_JPEG_QUALITY=68
OPENROUTER_VISION_TIMEOUT=45
MENU_PARSE_INITIAL_DETAIL_LIMIT=0
MENU_PARSE_WRITE_DISH_CACHE_ON_PARSE=false
MENU_STRUCTURE_RULE_FAST_PATH_MIN_ITEMS=20
APP_CONFIG_CACHE_SECONDS=300
IMAGE_SEARCH_PER_SOURCE=4
IMAGE_SEARCH_MIN_SCORE=30
IMAGE_SEARCH_TIMEOUT_SECONDS=5
IMAGE_SEARCH_REQUEST_TIMEOUT=3.5
IMAGE_SEARCH_WORKERS=8
IMAGE_DOWNLOAD_TIMEOUT_SECONDS=5
IMAGE_SEARCH_EARLY_SCORE=78
PEXELS_API_KEY=XXXXXXX
UNSPLASH_ACCESS_KEY=XXXXXXX
WIKIMEDIA_USER_AGENT=MenuTranslatorApp/1.0 (your-email@example.com)
OPENVERSE_API_URL=https://api.openverse.org/v1/images/
OPENAI_API_KEY=XXXXXXX
OPENAI_IMAGE_MODEL=gpt-image-1-mini
ENABLE_GENERATED_IMAGE_FALLBACK=true
EXPO_PUBLIC_API_BASE_URL=https://ai-menu-app.onrender.com
NEXT_PUBLIC_API_URL=https://menu-translator-app.onrender.com
NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-8286400764174465
NEXT_PUBLIC_ADSENSE_ANALYZE_SLOT=your_adsense_ad_unit_slot
NEXT_PUBLIC_ADSENSE_TEST=false
```

Current default parsing flow:

- Images use the configured OCR provider, usually Google Cloud Vision.
- PDFs use Google Document AI in `DOCUMENT_TEXT_PROVIDER=auto` when configured, then Cloud Vision/text fallback.
- Menu structure uses the markdown rule fast path when it can already extract enough items, otherwise official Gemini first in `MENU_STRUCTURE_PROVIDER=auto`, then OpenRouter, then the rule fallback.
- Google Cloud Translation Advanced v3 translates menu text in parallel batches.

# API Endpoints

## Health Check
```GET /health```
## Start Async Menu Parse
```POST /menus/parse/start```
## Parse Status
```GET /menus/parse/status/{task_id}```
## Cached Menu
```GET /menus/cache/{image_hash}```
## Legacy Parse Menu
```POST /menus/parse```
## OCR / Layout / Text Analysis
```POST /menus/ocr```
```POST /menus/layout```
```POST /menus/analyze```
## AI Recommendation
```POST /menus/recommend```
## Dish Detail
```POST /dish/detail```
## Auth
```POST /auth/register```
```POST /auth/login```
```POST /auth/google```
```GET /auth/google/url```
```GET /auth/me```
```POST /auth/profile```
```POST /auth/logout```
```POST /auth/password-reset```
```POST /auth/avatar```
## Language Options
```GET /i18n/languages```

# Database Schema
## app_config_entries
Stores:
```
runtime backend config flags and tunables
```
## dish_cache
Stores:
```
translated dishes
descriptions
ingredients
allergens
cuisine
AI metadata
```
## dish_images
Stores:
```
food images
web-sourced and generated image URLs
thumbnail cache
source metadata
```
## menu_parse_cache
Stores:
```
image hashes
OCR blocks
structured menu results
business metadata
currency
```
## menu_categories
Stores:
```
normalized category keys
source labels
translated labels
target language
```
## noise_keywords
Stores:
```
source-language-specific OCR and parser noise words
```
## translation_glossary_terms
Stores:
```
source and target glossary terms for menu translation
```
## unit_translations
Stores:
```
source-language-specific unit names and translations
```
## user_cart_state
Stores:
```
per-user saved cart state
```
## user_menu_history
Stores:
```
per-user parsed menu history
```
## users
Stores:
```
Supabase Auth user id
username and email
profile preferences
avatar URL
role
```
## user_subscriptions
Stores:
```
membership plan
subscription status
store and payment identifiers
```
## Storage Bucket Dish_Images
```
generated
preset
restaurants
web_found
```

# Completed Roadmap Items
- AI-generated and web-sourced dish images
- Menu history
- Cloud image storage with Supabase Storage
- Async menu parsing with polling
- Menu parse cache by image hash and target language
- Multi-language UI and translation flow for English, simplified Chinese, traditional Chinese, and Spanish
- AI smart recommendation modal and backend recommendation endpoint
- Supabase Auth login, registration, Google OAuth handoff, password reset, profile preferences, and avatar upload
- Native AdMob integration with web-safe fallback modules
- Share dialog and shareable cached menu URLs
- Currency extraction and frontend price formatting

# Future Roadmap

## 1. Further Improve OCR Accuracy and Efficiency
Goal: make image and PDF menu parsing more reliable, faster, and easier to debug.

Implementation steps:
1. Build an OCR benchmark set with real menu images and PDFs, including clean photos, angled photos, low-light photos, multi-column menus, and dense restaurant menus.
2. Add stronger image preprocessing before OCR, such as rotation correction, contrast enhancement, denoising, sharpening, resizing, and optional perspective correction.
3. Preserve and display OCR bounding boxes and confidence scores so downstream parsing can use layout, columns, sections, and low-confidence warnings.
4. Add a dedicated OCR-block cache when useful, separate from the current full menu parse cache.
5. Improve PDF handling so multi-page PDFs can be processed, merged, and debugged page by page.
6. Add OCR timing logs and confidence metrics to compare preprocessing strategies, Document AI, Cloud Vision, local OCR, and vision models.
7. Add fallback logic for failed or low-confidence OCR, such as rerunning with alternate preprocessing, OCR provider, or language settings.

## 2. Harden Chinese OCR and Chinese-to-English Translation
Goal: make Chinese menu input reliable enough for production Chinese-to-English usage.

Implementation steps:
1. Expand the Chinese OCR review set for simplified Chinese, traditional Chinese, mixed English/Chinese menus, handwritten-style fonts, and dense image-heavy layouts.
2. Tune automatic OCR language selection and fallback order for Chinese, English, and mixed-language menus.
3. Add Chinese-specific cleanup for punctuation, full-width characters, prices, dish numbering, spice markers, and menu section headings.
4. Add regression tests that compare Chinese OCR text, extracted categories, translated dish names, descriptions, allergens, and prices.
5. Improve normalized English cache-key generation for non-English source dishes.
6. Validate output quality with a small manual review set before expanding to more language pairs.

## 3. Improve AI Smart Recommendation
Goal: turn the current recommendation module into a more personalized and persistent feature.

Implementation steps:
1. Save recommendation sessions with user id, menu hash, answers, recommended dish ids, and feedback.
2. Use saved profile preferences as defaults for party size, diet, allergies, budget, and taste.
3. Add backend validation so recommendations never include dishes outside the current parsed menu or dishes that conflict with known allergies.
4. Add feedback actions such as liked, not interested, too expensive, allergy concern, and added to order list.
5. Use recommendation feedback to improve future prompts and ranking.
6. Add analytics for recommendation conversion into cart/order-list actions.

## 4. Production Advertising and Monetization
Goal: move the current ad integration from plumbing to controlled production monetization.

Implementation steps:
1. Add backend feature flags or remote config so ad placements can be enabled, disabled, or adjusted without shipping a new app version.
2. Gate all ad rendering by trusted membership status from the backend.
3. Track ad impressions, clicks, load failures, placement type, and app platform in analytics tables.
4. Add privacy and consent handling where required, especially for personalized ads.
5. Validate production AdMob ids with provider test modes before enabling live ads.
6. Add rewarded ad rules only for optional premium features, not the core menu understanding flow.

## 5. Membership, Payments, and Ad Gating
Goal: connect current Auth/subscription records to paid membership and ad-free behavior.

Implementation steps:
1. Add subscription status endpoints that return trusted membership state for the current authenticated user.
2. Integrate payment providers for App Store, Google Play, and optionally Stripe for web.
3. Store membership status in server-side subscription records, not editable user metadata.
4. Attach authenticated user ids to menu history, recommendation sessions, carts, and future favorites.
5. Add RLS policies before exposing user-owned data directly from Supabase.
6. Gate ads and premium features based on backend-verified membership status.
7. Add expiration, renewal, cancellation, and grace-period handling.

## Later Enhancements
- User manage system
- More language pairs beyond the currently enabled English, Chinese, and Spanish options
- Restaurant recommendation engine
- Admin dashboard for OCR quality, AI cost, ad performance, and storage usage
- Feature of read menu from URL or QR code, translate from website
- Continuously improve OCR quality, parsing result quality and menu analyze speed
- Build to publish on Apple APP store
- Build to publish on Android stores: Play Store, Amazon Appstore, OPPO App Market, Samsung Galaxy Store, VIVO App Store, Xiaomi GetApps

# Cost Optimization

The system minimizes LLM token usage by:
- separating OCR from semantic parsing
- using lightweight structure extraction
- caching dish metadata in PostgreSQL
- only enriching uncached dishes

# License
This project is licensed under the MIT License - see the LICENSE file for details.
