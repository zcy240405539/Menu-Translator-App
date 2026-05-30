# AI Menu Translator & Food Analyzer

An AI-powered multilingual restaurant menu translation and food analysis system built with FastAPI, React Native (Expo), PaddleOCR, and OpenRouter.

Users can:
- Scan restaurant menus
- Translate menus into English or Chinese
- View AI-generated dish descriptions
- Browse food images
- Cache dish knowledge for lower AI costs and faster responses

---

# Features

- Multi-language menu OCR
- AI-powered menu parsing
- Chinese ↔ English translation
- Dish detail generation
- Dish image support
- PostgreSQL dish cache
- Smart token-saving architecture
- React Native mobile app
- FastAPI backend

---

# Tech Stack
## Frontend
- React Native
- Expo
- Axios

## Backend
- FastAPI
- PaddleOCR
- OpenRouter API
- SQLAlchemy

## Database
- PostgreSQL

## Image Storage
- Static image cache
- Future Cloudinary support

---

# Architecture

```text
User Upload
    ↓
PaddleOCR
    ↓
OpenRouter (Light Structure Parsing)
    ↓
PostgreSQL Dish Cache
    ↓
Missing Dish Enrichment
    ↓
Image Cache
    ↓
Frontend Rendering
```
## APP Structure
```
menu-translator-app/
├─ README.md
├─ LICENSE
├─ backend/
│  ├─ app/
│  │	├─ main.py
│  │	├─ config.py
│  │	├─ database.py
│  │	├─ models.py
│  │	├─ schemas.py
│  │	├─ ocr_service.py
│  │	├─ pdf_service.py
│  │	├─ image_service.py
│  │	├─ dish_cache_service.py
│  │	├─ menu_cache_service.py
│  │	├─ category_service.py
│  │	├─ menu_layout_service.py
│  │	└─ openrouter_service.py
│  ├─ static/
│  │	├─ README/
│  │	├─ dish_images/
│  │	└─ generated_images/
│  ├─ uploads/
│  ├─ .env
│  └─ requirements.txt
└─ frontend/
   ├─ App.js
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
   └─ components/
      └─ DishDetailModal.js
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

# Environment Variables
```
OPENROUTER_API_KEY=XXXXXXX
OPENROUTER_MODEL=openrouter/owl-alpha
DATABASE_URL=XXXXXXX
SUPABASE_URL=https://XXXXXX.supabase.co
SUPABASE_SERVICE_ROLE_KEY=XXXXXX
SUPABASE_BUCKET=Dish_Images
PEXELS_API_KEY=XXXXXXX
UNSPLASH_ACCESS_KEY=XXXXXXX
WIKIMEDIA_USER_AGENT=MenuTranslatorApp/1.0 (your-email@example.com)
OPENAI_API_KEY=XXXXXXX
OPENAI_IMAGE_MODEL=gpt-image-1-mini
ENABLE_GENERATED_IMAGE_FALLBACK=true
```

# API Endpoints

## Health Check
```GET /health```
## Parse Menu
```POST /menus/parse```

# Database Schema
## dish_cache
Stores:
```
translated dishes
descriptions
ingredients
allergens
AI metadata
```
## dish_images
Stores:
```
food images
generated image URLs
thumbnail cache
```
## Storage Bucket Dish_Images
```
generated
preset
restaurants
```

# Completed Roadmap Items
- AI-generated and web-sourced dish images
- Menu history
- Cloud image storage with Supabase Storage

# Future Roadmap

## 1. Improve OCR Accuracy and Efficiency
Goal: make image and PDF menu parsing more reliable, faster, and easier to debug.

Implementation steps:
1. Build an OCR benchmark set with real menu images and PDFs, including clean photos, angled photos, low-light photos, multi-column menus, and dense restaurant menus.
2. Add image preprocessing before PaddleOCR, such as rotation correction, contrast enhancement, denoising, sharpening, resizing, and optional perspective correction.
3. Preserve OCR bounding boxes and confidence scores so downstream parsing can use layout, columns, sections, and low-confidence warnings.
4. Add OCR result caching by file hash to avoid rerunning OCR for the same image or PDF.
5. Split PDF handling into page rendering, per-page OCR, and result merging so large PDFs can be processed incrementally.
6. Add OCR timing logs and confidence metrics to compare preprocessing strategies and PaddleOCR settings.
7. Add fallback logic for failed or low-confidence OCR, such as rerunning with alternate preprocessing or language settings.

## 2. Add Accurate Chinese OCR for Chinese-to-English Translation
Goal: support Chinese menu input and translate Chinese menus into English.

Implementation steps:
1. Enable PaddleOCR Chinese recognition by selecting the correct OCR language model when `source_language` is Chinese.
2. Pass both `source_language` and `target_language` through the frontend upload flow, backend API, OCR service, parser, cache lookup, and AI translation prompts.
3. Add Chinese-specific cleanup for punctuation, full-width characters, prices, dish numbering, spice markers, and menu section headings.
4. Update AI parsing prompts so Chinese menu categories and dishes are extracted into the same structured schema used by English menus.
5. Update dish cache keys to include source language, target language, normalized original name, and restaurant context when available.
6. Add Chinese-to-English examples and tests for menus with simplified Chinese, traditional Chinese, mixed English/Chinese, and image-heavy layouts.
7. Validate output quality with a small manual review set before expanding to more language pairs.

## 3. AI Smart Recommendation Module
Goal: let users open a recommendation flow from the result screen and receive personalized dish suggestions.

Implementation steps:
1. Add a recommendation entry point on `MenuResultScreen`, such as a button that opens a recommendation modal or screen.
2. Ask users structured questions: party size, budget, spice preference, dietary restrictions, allergies, disliked ingredients, cuisine preference, and whether they want popular, balanced, adventurous, or value-focused picks.
3. Send the current parsed menu plus user answers to a backend recommendation endpoint.
4. Create an AI prompt that recommends dishes only from the parsed menu and returns structured JSON with dish ids, reasons, warnings, budget notes, and optional ordering combinations.
5. Add backend validation so recommendations never include dishes that are not present in the current menu.
6. Save recommendation sessions for future personalization and analytics.
7. Render recommendation cards in the frontend with reasons, allergy warnings, estimated fit, and an add-to-cart action.

## 4. Advertising and Monetization Module
Goal: add ads in a controlled way while keeping the core menu translation flow usable.

Implementation steps:
1. Choose the ad provider, with Google AdMob as the likely first option for a React Native Expo app.
2. Add ad placement rules for non-member users, such as result-screen banner ads, history-screen banner ads, and optional rewarded ads for premium AI features.
3. Add a backend feature flag or remote config so ad placements can be enabled, disabled, or adjusted without shipping a new app version.
4. Track ad impressions, clicks, and placement performance in a database table for analytics.
5. Add privacy and consent handling where required, especially for personalized ads.
6. Make all ad rendering conditional on membership status so paid users can have an ad-free experience.
7. Test the app with provider test ad units before enabling production ads.

## 5. User Login, Membership, and Ad Gating
Goal: identify users, support future membership features, and decide whether ads should be shown.

Implementation steps:
1. Add Supabase Auth for email/password login first, then optionally add OAuth providers such as Google or Apple.
2. Create user profile and membership tables, such as `profiles` and `user_memberships`, with Row Level Security policies.
3. Store membership status in trusted server-side data, not editable user metadata.
4. Add login, signup, logout, password reset, and session restore screens in the frontend.
5. Attach authenticated user ids to menu history, recommendation sessions, carts, and future favorites.
6. Add backend JWT verification so protected APIs can trust the current user.
7. Gate ads and premium features based on membership status returned by the backend.

## Later Enhancements
- Favorites
- More language pairs beyond Chinese and English
- Restaurant recommendation engine
- Subscription payments
- Admin dashboard for OCR quality, AI cost, ad performance, and storage usage

# Cost Optimization

The system minimizes LLM token usage by:
- separating OCR from semantic parsing
- using lightweight structure extraction
- caching dish metadata in PostgreSQL
- only enriching uncached dishes

# License
This project is licensed under the MIT License - see the LICENSE file for details.
