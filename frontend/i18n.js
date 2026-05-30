const STORAGE_KEY = "menu_app_language";

export const DEFAULT_LANGUAGE = "zh";
export const DEFAULT_SOURCE_LANGUAGE = "en";

export const LANGUAGES = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "zh", label: "简体中文", flag: "🇨🇳" },
  { code: "zh-Hant", label: "繁體中文", flag: "🇹🇼" },
  // { code: "ja", label: "日本語", flag: "🇯🇵" },
  // { code: "ko", label: "한국어", flag: "🇰🇷" },
  // { code: "fr", label: "Français", flag: "🇫🇷" },
  // { code: "es", label: "Español", flag: "🇪🇸" },
  // { code: "de", label: "Deutsch", flag: "🇩🇪" },
  // { code: "it", label: "Italiano", flag: "🇮🇹" },
];

export const SOURCE_LANGUAGES = [
  { code: "auto", label: "Auto Detect", flag: "🌐" },
  ...LANGUAGES,
];

export const translations = {
  en: {
    appTitle: "Menu Translator",

    home: {
      heroTitle: "Understand any menu",
      heroSubtitle:
        "Take a photo or upload a menu image. We’ll translate it and explain every dish.",
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
    appTitle: "菜单翻译助手",

    home: {
      heroTitle: "看懂任何菜单",
      heroSubtitle: "拍照或上传菜单图片，我们会帮你翻译菜单并解释每一道菜。",
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
    appTitle: "菜單翻譯助手",

    home: {
      heroTitle: "看懂任何菜單",
      heroSubtitle: "拍照或上傳菜單圖片，我們會幫你翻譯菜單並解釋每一道菜。",
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
};

export function getText(lang) {
  return translations[lang] || translations.en;
}

export function isChineseLanguage(lang) {
  return lang === "zh" || lang === "zh-Hant" || String(lang || "").startsWith("zh-");
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
