const STORAGE_KEY = "menu_app_language";

export const DEFAULT_LANGUAGE = "zh";
export const DEFAULT_SOURCE_LANGUAGE = "en";

export const LANGUAGES = [
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
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
      chinese: "中文",
      takePicture: "Take Picture",
      selectFromFile: "Select from File",
      selectedMenu: "Selected Menu",
      analyzeMenu: "Analyze Menu",
      analyzingMenu: "Analyzing menu...",
      noImageTitle: "No Image",
      noImageMessage: "Please take a picture or select a menu image first.",
      permissionRequired: "Permission Required",
      cameraPermission: "Camera permission is required.",
      photoPermission: "Photo library permission is required.",
      analysisFailed: "Menu Analysis Failed",
      unknownError: "Unknown error",
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
      chinese: "中文",
      takePicture: "拍照识别",
      selectFromFile: "从文件选择",
      selectedMenu: "已选择菜单",
      analyzeMenu: "分析菜单",
      analyzingMenu: "正在分析菜单...",
      noImageTitle: "未选择图片",
      noImageMessage: "请先拍摄或选择一张菜单图片。",
      permissionRequired: "需要权限",
      cameraPermission: "需要相机权限才能拍照。",
      photoPermission: "需要相册权限才能选择图片。",
      analysisFailed: "菜单分析失败",
      unknownError: "未知错误",
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
};

export function getText(lang) {
  return translations[lang] || translations.en;
}

export function getInitialLanguage() {
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
  }

  const browserLang =
    typeof navigator !== "undefined"
      ? navigator.language?.slice(0, 2)
      : null;

  return translations[browserLang] ? browserLang : DEFAULT_LANGUAGE;
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