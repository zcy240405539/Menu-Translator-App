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
│  │	├─ openrouter_service.py
│  │	└─ .env
│  ├─ static/
│  │	├─ README/
│  │	├─ dish_images/
│  │	└─ generated_images/
│  ├─ uploads/
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

# Future Roadmap
- AI-generated dish images
- User accounts
- Favorites
- Menu history
- Cloud image storage
- Multi-language support
- Restaurant recommendation engine

# Cost Optimization

The system minimizes LLM token usage by:
- separating OCR from semantic parsing
- using lightweight structure extraction
- caching dish metadata in PostgreSQL
- only enriching uncached dishes

# License
This project is licensed under the MIT License - see the LICENSE file for details.