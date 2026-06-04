const STORAGE_KEY = "menu_app_language";

export const DEFAULT_LANGUAGE = "zh";
export const DEFAULT_SOURCE_LANGUAGE = "en";

export const LANGUAGES = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "zh", label: "简体中文", flag: "🇨🇳" },
  { code: "zh-Hant", label: "繁體中文", flag: "🇹🇼" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  // { code: "ja", label: "日本語", flag: "🇯🇵" },
  // { code: "ko", label: "한국어", flag: "🇰🇷" },
  // { code: "fr", label: "Français", flag: "🇫🇷" },
  // { code: "de", label: "Deutsch", flag: "🇩🇪" },
  // { code: "it", label: "Italiano", flag: "🇮🇹" },
];

export const SOURCE_LANGUAGES = [
  { code: "auto", label: "Auto Detect", flag: "🌐" },
  ...LANGUAGES,
];

export const translations = {
  en: {
    appTitle: "AI Menu Assistant",

    home: {
      heroTitle: "Let AI read the menu for you",
      heroSubtitle:
        "Take a photo or upload a menu, AI will translate and explain every dish.",
      targetLanguage: "Target language",
      sourceLanguage: "Source language",
      autoDetect: "Auto Detect",
      english: "English",
      chinese: "Simplified Chinese",
      traditionalChinese: "Traditional Chinese",
      takePicture: "Take Picture",
      selectFromFile: "Select from File",
      selectedMenu: "Selected Menu",
      pdfMenu: "PDF Menu",
      fileSelectionFailed: "File selection failed",
      analyzeMenu: "Analyze Menu",
      analyzingMenu: "Analyzing menu...",
      noImageTitle: "No Image",
      noImageMessage: "Please take a picture or select a menu image first.",
      permissionRequired: "Permission Required",
      cameraPermission: "Camera permission is required.",
      photoPermission: "Photo library permission is required.",
      analysisFailed: "Menu Analysis Failed",
      unknownError: "Unknown error",
      shareTitle: "Share Menu Translator",
      shareSubtitle: "Choose where to share the current page.",
      shareMessage: "Translate and understand menus with Menu Translator.",
      shareFailed: "Unable to open share link",
    },

    result: {
      title: "Menu Results",
      items: "items",
      empty: "No menu items found",
      originalUnavailable: "Original name unavailable",
      restaurantFallback: "Restaurant",
      sourceFallback: "Unknown",
      aiRecommendBtn: "AI Recommend",
    },

    recommend: {
      title: "AI Recommendation",
      peopleLabel: "Number of People",
      peoplePlaceholder: "e.g., 2",
      dietLabel: "Dietary Constraints",
      budgetLabel: "Budget",
      budgetPlaceholder: "e.g., $50 or No Limit",
      tasteLabel: "Taste Preference",
      tastePlaceholder: "e.g., Spicy, Mild, Less Salt",
      generateBtn: "Generate Recommendation",
      generating: "AI is analyzing menu...",
      suggestionTitle: "Ordering Suggestion",
      recommendedItemsTitle: "Recommended Dishes",
      addBtn: "Add to Order List",
      addedBtn: "Added",
      backBtn: "Modify Options",
      closeBtn: "Close",
      error: "Failed to generate recommendation. Please try again.",
    },

    detail: {
      original: "Original",
      price: "Price",
      description: "Description",
      ingredients: "Ingredients",
      allergens: "Allergens",
      spicyLevel: "Spicy Level",
      imagePrompt: "Image Prompt",
      close: "Close",
      unknown: "Unknown",
      none: "None",
      close: "Close",
    },

    categories: {
      breakfast: "Breakfast",
      pastries: "Pastries",
      savory: "Savory",
      fromage: "Fromage",
      cafe: "Cafe & Tea",
      sides: "Sides",
      additions: "Additions",
      snacks: "Snacks",
      appetizers: "Appetizers",
      mains: "Mains",
      dinner: "Dinner",
      dessert: "Dessert",
      drinks: "Drinks",
      other: "Other",
    },
  },

  zh: {
    appTitle: "AI菜单助手",

    home: {
      heroTitle: "让AI为你解读菜单",
      heroSubtitle: "拍照或上传菜单，AI帮你翻译解读每一道菜。",
      targetLanguage: "目标语言",
      sourceLanguage: "菜单原语言",
      autoDetect: "自动识别",
      english: "English",
      chinese: "简体中文",
      traditionalChinese: "繁体中文",
      takePicture: "拍照识别",
      selectFromFile: "从文件选择",
      selectedMenu: "已选择菜单",
      pdfMenu: "PDF 菜单",
      fileSelectionFailed: "文件选择失败",
      analyzeMenu: "分析菜单",
      analyzingMenu: "正在分析菜单...",
      noImageTitle: "未选择图片",
      noImageMessage: "请先拍摄或选择一张菜单图片。",
      permissionRequired: "需要权限",
      cameraPermission: "需要相机权限才能拍照。",
      photoPermission: "需要相册权限才能选择图片。",
      analysisFailed: "菜单分析失败",
      unknownError: "未知错误",
      shareTitle: "分享菜单翻译助手",
      shareSubtitle: "选择要分享到的平台。",
      shareMessage: "用菜单翻译助手翻译并看懂菜单。",
      shareFailed: "无法打开分享链接",
    },

    result: {
      title: "菜单分析结果",
      items: "道菜",
      empty: "没有解析到菜品",
      originalUnavailable: "暂无原文名称",
      restaurantFallback: "餐厅",
      sourceFallback: "未知语言",
      aiRecommendBtn: "AI智能推荐",
    },

    recommend: {
      title: "AI 智能推荐",
      peopleLabel: "用餐人数",
      peoplePlaceholder: "例如：2",
      dietLabel: "饮食习惯 (选填)",
      budgetLabel: "预算 (选填)",
      budgetPlaceholder: "例如：100 或 无限制",
      tasteLabel: "口味偏好 (选填)",
      tastePlaceholder: "例如：清淡、微辣、少盐",
      generateBtn: "生成推荐方案",
      generating: "AI 正在分析菜单并为您配餐...",
      suggestionTitle: "配餐建议",
      recommendedItemsTitle: "推荐菜品",
      addBtn: "加入待点",
      addedBtn: "已加入",
      backBtn: "重新配餐",
      closeBtn: "关闭",
      error: "生成推荐失败，请重试。",
    },

    detail: {
      original: "原文",
      price: "价格",
      description: "介绍",
      ingredients: "主要食材",
      allergens: "过敏原",
      spicyLevel: "辣度",
      imagePrompt: "图片提示词",
      close: "关闭",
      unknown: "未知",
      none: "无",
      close: "关闭",
    },

    categories: {
      breakfast: "早餐",
      pastries: "糕点",
      savory: "咸点",
      fromage: "奶酪",
      cafe: "咖啡与茶",
      sides: "配菜",
      additions: "加点",
      snacks: "小吃",
      appetizers: "前菜",
      mains: "主菜",
      dinner: "晚餐",
      dessert: "甜点",
      drinks: "饮品",
      other: "其他",
    },
  },

  "zh-Hant": {
    appTitle: "AI菜單助手",

    home: {
      heroTitle: "讓AI為你解讀菜單",
      heroSubtitle: "拍照或上傳菜單，AI幫你翻譯解讀每一道菜。",
      targetLanguage: "目標語言",
      sourceLanguage: "菜單原語言",
      autoDetect: "自動識別",
      english: "English",
      chinese: "簡體中文",
      traditionalChinese: "繁體中文",
      takePicture: "拍照識別",
      selectFromFile: "從檔案選擇",
      selectedMenu: "已選擇菜單",
      pdfMenu: "PDF 菜單",
      fileSelectionFailed: "檔案選擇失敗",
      analyzeMenu: "分析菜單",
      analyzingMenu: "正在分析菜單...",
      noImageTitle: "未選擇圖片",
      noImageMessage: "請先拍攝或選擇一張菜單圖片。",
      permissionRequired: "需要權限",
      cameraPermission: "需要相機權限才能拍照。",
      photoPermission: "需要相簿權限才能選擇圖片。",
      analysisFailed: "菜單分析失敗",
      unknownError: "未知錯誤",
      shareTitle: "分享菜單翻譯助手",
      shareSubtitle: "選擇要分享到的平台。",
      shareMessage: "用菜單翻譯助手翻譯並看懂菜單。",
      shareFailed: "無法開啟分享連結",
    },

    result: {
      title: "菜單分析結果",
      items: "道菜",
      empty: "沒有解析到菜品",
      originalUnavailable: "暫無原文名稱",
      restaurantFallback: "餐廳",
      sourceFallback: "未知語言",
      aiRecommendBtn: "AI智能推薦",
    },

    recommend: {
      title: "AI 智能推薦",
      peopleLabel: "用餐人數",
      peoplePlaceholder: "例如：2",
      dietLabel: "飲食習慣 (選填)",
      budgetLabel: "預算 (選填)",
      budgetPlaceholder: "例如：100 或 無限制",
      tasteLabel: "口味偏好 (選填)",
      tastePlaceholder: "例如：清淡、微辣、少鹽",
      generateBtn: "生成推薦方案",
      generating: "AI 正在分析菜單並為您配餐...",
      suggestionTitle: "配餐建議",
      recommendedItemsTitle: "推薦菜品",
      addBtn: "加入待點",
      addedBtn: "已加入",
      backBtn: "重新推薦",
      closeBtn: "關閉",
      error: "生成推薦失敗，請重試。",
    },

    detail: {
      original: "原文",
      price: "價格",
      description: "介紹",
      ingredients: "主要食材",
      allergens: "過敏原",
      spicyLevel: "辣度",
      imagePrompt: "圖片提示詞",
      close: "關閉",
      unknown: "未知",
      none: "無",
    },

    categories: {
      breakfast: "早餐",
      pastries: "糕點",
      savory: "鹹點",
      fromage: "起司",
      cafe: "咖啡與茶",
      sides: "配菜",
      additions: "加點",
      snacks: "小吃",
      appetizers: "前菜",
      mains: "主菜",
      dinner: "晚餐",
      dessert: "甜點",
      drinks: "飲品",
      other: "其他",
    },
  },

  es: {
    appTitle: "Asistente de Menú IA",

    home: {
      heroTitle: "Deja que la IA lea el menú por ti",
      heroSubtitle:
        "Toma una foto o sube un menú, la IA te ayudará a traducir y explicar cada plato.",
      targetLanguage: "Idioma destino",
      sourceLanguage: "Idioma origen",
      autoDetect: "Detectar automáticamente",
      english: "English",
      chinese: "Chino Simplificado",
      traditionalChinese: "Chino Tradicional",
      takePicture: "Tomar Foto",
      selectFromFile: "Seleccionar de Archivo",
      selectedMenu: "Menú Seleccionado",
      pdfMenu: "Menú en PDF",
      fileSelectionFailed: "Fallo al seleccionar archivo",
      analyzeMenu: "Analizar Menú",
      analyzingMenu: "Analizando menú...",
      noImageTitle: "Sin Imagen",
      noImageMessage: "Por favor, tome una foto o seleccione una imagen de menú primero.",
      permissionRequired: "Permiso Requerido",
      cameraPermission: "Se requiere permiso de cámara.",
      photoPermission: "Se requiere permiso de galería de fotos.",
      analysisFailed: "Fallo en el Análisis del Menú",
      unknownError: "Error desconocido",
      shareTitle: "Compartir Asistente de Menú IA",
      shareSubtitle: "Elija dónde compartir la página actual.",
      shareMessage: "Traduzca y comprenda menús con Asistente de Menú IA.",
      shareFailed: "No se pudo abrir el enlace de compartir",
    },

    result: {
      title: "Resultados del Menú",
      items: "platos",
      empty: "No se encontraron platos en el menú",
      originalUnavailable: "Nombre original no disponible",
      restaurantFallback: "Restaurante",
      sourceFallback: "Desconocido",
      aiRecommendBtn: "Recomendación IA",
    },

    recommend: {
      title: "Recomendación IA",
      peopleLabel: "Número de Personas",
      peoplePlaceholder: "ej., 2",
      dietLabel: "Restricciones Dietéticas (Opcional)",
      budgetLabel: "Presupuesto (Opcional)",
      budgetPlaceholder: "ej., $50 o Sin Límite",
      tasteLabel: "Preferencia de Sabor (Opcional)",
      tastePlaceholder: "ej., Picante, Suave, Menos Sal",
      generateBtn: "Generar Recomendación",
      generating: "La IA está analizando el menú...",
      suggestionTitle: "Sugerencia de Pedido",
      recommendedItemsTitle: "Platos Recomendados",
      addBtn: "Añadir a la Lista",
      addedBtn: "Añadido",
      backBtn: "Modificar Opciones",
      closeBtn: "Cerrar",
      error: "Error al generar la recomendación. Por favor, inténtelo de nuevo.",
    },

    detail: {
      original: "Original",
      price: "Precio",
      description: "Descripción",
      ingredients: "Ingredientes",
      allergens: "Alérgenos",
      spicyLevel: "Nivel de Picante",
      imagePrompt: "Indicación de Imagen",
      close: "Cerrar",
      unknown: "Desconocido",
      none: "Ninguno",
    },

    categories: {
      breakfast: "Desayuno",
      pastries: "Pastelería",
      savory: "Salado",
      fromage: "Queso",
      cafe: "Café y Té",
      sides: "Acompañamientos",
      additions: "Adicionales",
      snacks: "Aperitivos",
      appetizers: "Entradas",
      mains: "Platos Principales",
      dinner: "Cena",
      dessert: "Postre",
      drinks: "Bebidas",
      other: "Otros",
    },
  },
};

export function getText(lang) {
  return translations[lang] || translations.en;
}

export function isChineseLanguage(lang) {
  return lang === "zh" || lang === "zh-Hant" || String(lang || "").startsWith("zh-");
}

export function getUrlLangParam(langCode) {
  if (langCode === "zh") return "zh-cn";
  if (langCode === "zh-Hant") return "zh-tw";
  if (langCode === "es") return "es";
  return "en";
}

export function mapUrlLangToInternal(langParam) {
  if (!langParam) return null;
  const normalized = String(langParam).toLowerCase();
  if (normalized === "zh-cn" || normalized === "zh") return "zh";
  if (normalized === "zh-tw" || normalized === "zh-hk" || normalized === "zh-hant") return "zh-Hant";
  if (normalized === "es") return "es";
  return "en";
}

export function getInitialLanguage() {
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
  }

  const browserLang =
    typeof navigator !== "undefined"
      ? navigator.language
      : null;

  const normalizedBrowserLang = String(browserLang || "").toLowerCase();
  if (normalizedBrowserLang === "zh-tw" || normalizedBrowserLang === "zh-hk" || normalizedBrowserLang === "zh-hant") {
    return "zh-Hant";
  }
  if (normalizedBrowserLang.startsWith("zh")) {
    return "zh";
  }

  const shortBrowserLang = normalizedBrowserLang.slice(0, 2);
  return translations[shortBrowserLang] ? shortBrowserLang : DEFAULT_LANGUAGE;
}

export function hasSavedLanguage() {
  return typeof localStorage !== "undefined" && !!localStorage.getItem(STORAGE_KEY);
}

export function saveLanguage(lang) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, lang);
  }
}

export function t(lang, key) {
  const keys = key.split(".");
  let value = translations[lang];

  for (const k of keys) {
    value = value?.[k];
  }

  if (value) return value;

  let fallback = translations.en;
  for (const k of keys) {
    fallback = fallback?.[k];
  }

  return fallback || key;
}
