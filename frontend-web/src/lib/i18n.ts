export type WebLanguageCode = "en" | "zh-cn" | "zh-Hant" | "es";

const STORAGE_KEY = "menu_app_language";

export const DEFAULT_LANGUAGE: WebLanguageCode = "en";

export const LANGUAGES: { code: WebLanguageCode; label: string; shortLabel: string }[] = [
  { code: "en", label: "English", shortLabel: "English" },
  { code: "zh-cn", label: "Simplified Chinese", shortLabel: "Simplified" },
  { code: "zh-Hant", label: "Traditional Chinese", shortLabel: "Traditional" },
  { code: "es", label: "Spanish", shortLabel: "Spanish" },
];

export const SOURCE_LANGUAGES = [{ code: "auto", label: "Auto Detect", shortLabel: "Auto" }, ...LANGUAGES];

export function normalizeLanguage(lang?: string | null): WebLanguageCode {
  const normalized = String(lang || "").toLowerCase();
  if (normalized === "zh" || normalized === "zh-cn" || normalized === "zh-hans") return "zh-cn";
  if (["zh-tw", "zh-hk", "zh-hant"].includes(normalized)) return "zh-Hant";
  if (normalized === "es") return "es";
  return "en";
}

export function getInitialLanguage(): WebLanguageCode {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved) return normalizeLanguage(saved);

  const browserLang = window.navigator.language || "";
  if (browserLang.toLowerCase().startsWith("zh")) return normalizeLanguage(browserLang);
  return normalizeLanguage(browserLang.slice(0, 2));
}

export function saveLanguage(lang: WebLanguageCode) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, lang);
  }
}

export function htmlLanguage(lang: WebLanguageCode) {
  if (lang === "zh-cn") return "zh-CN";
  return lang;
}

export function languageShortLabel(lang: string) {
  return LANGUAGES.find((option) => option.code === normalizeLanguage(lang))?.shortLabel || "English";
}

export function sourceLanguageShortLabel(lang: string) {
  if (lang === "auto") return "Auto";
  return languageShortLabel(lang);
}

export const webText = {
  en: {
    metaTitle: "AIMenuAPP - Translate Menus & Order with Ease",
    nav: {
      language: "Select page language",
      share: "Share",
      history: "History",
      cart: "Cart",
      account: "Account",
    },
    home: {
      kicker: "Start translating",
      titleLines: ["Translate menus,", "order with ease"],
      subtitle: "Upload photos, PDFs, websites, or delivery app links to get clear dish names, descriptions, and ingredients.",
      steps: ["Photos/PDF/Web", "AI Translation", "Order Ready", "Smart Suggestions"],
    },
    features: {
      title: "Key Features",
      subtitle: "Your smart AI menu translator helps you understand local dishes anywhere in the world.",
      cards: [
        { title: "Translate Menus", desc: "Translate supported menus between English, Chinese, and Spanish." },
        { title: "Detailed Descriptions", desc: "Get clear explanations of unfamiliar dishes and ingredients." },
        { title: "Order with Ease", desc: "Build a clear list of chosen dishes to show the waiter." },
        { title: "All Menu Types", desc: "Photos, PDFs, and menu links route to the same backend parser." },
      ],
    },
    result: {
      backHome: "Back to Home",
      restaurantMenu: "Restaurant Menu",
      loading: "Loading",
      dishes: "dishes",
      loadingResult: "Loading menu result...",
      noItems: "No menu items found.",
      notAvailable: "Menu result is not available yet. Please refresh in a moment.",
      other: "Other",
      unnamedDish: "Unnamed dish",
    },
    analyzer: {
      sourceLanguage: "Source language",
      targetLanguage: "Target language",
      autoDetect: "Auto Detect",
      takePicture: "Take Picture",
      changePicture: "Change Picture",
      selectFromFile: "Select from File",
      changeFile: "Change File",
      selected: "Selected",
      menuLink: "Menu webpage or share link",
      analyzeMenu: "Analyze Menu",
      analyzing: "Analyzing...",
      noInput: "Please select a file, take a picture, or enter a URL.",
      startFileFailed: "Failed to start parsing from file",
      startUrlFailed: "Failed to start parsing from URL",
      noTask: "Server did not return a parse task.",
      timeout: "Parsing is still running. Please try again in a moment.",
      statusFailed: "Failed to check parse status",
      parseFailed: "Parsing failed on server",
      noHash: "Parsed data did not contain a menu hash.",
      unknownError: "An error occurred during analysis.",
      ad: "Advertisement",
    },
    footer: {
      privacy: "Privacy Policy",
      deletion: "Account Deletion",
      rights: "All rights reserved.",
    },
  },
  "zh-cn": {
    metaTitle: "AIMenuAPP - 翻译菜单，轻松点餐",
    nav: {
      language: "选择页面语言",
      share: "分享",
      history: "历史",
      cart: "购物车",
      account: "账号",
    },
    home: {
      kicker: "开始翻译",
      titleLines: ["翻译菜单，", "轻松点餐"],
      subtitle: "上传照片、PDF、网站或外卖分享链接，快速获得清晰的菜名、描述和配料。",
      steps: ["照片/PDF/网页", "AI 翻译", "准备点餐", "智能推荐"],
    },
    features: {
      title: "核心功能",
      subtitle: "智能 AI 菜单翻译器帮助你在世界各地看懂当地菜品。",
      cards: [
        { title: "菜单翻译", desc: "支持英语、中文和西班牙语菜单互译。" },
        { title: "详细说明", desc: "解释陌生菜品、配料和口味。" },
        { title: "轻松点餐", desc: "整理清晰的点餐清单，方便给服务员查看。" },
        { title: "多种菜单来源", desc: "照片、PDF 和菜单链接都走同一套后端解析流程。" },
      ],
    },
    result: {
      backHome: "返回首页",
      restaurantMenu: "餐厅菜单",
      loading: "加载中",
      dishes: "道菜",
      loadingResult: "正在加载菜单结果...",
      noItems: "没有找到菜单项。",
      notAvailable: "菜单结果暂时不可用，请稍后刷新。",
      other: "其他",
      unnamedDish: "未命名菜品",
    },
    analyzer: {
      sourceLanguage: "源语言",
      targetLanguage: "目标语言",
      autoDetect: "自动识别",
      takePicture: "拍照",
      changePicture: "更换照片",
      selectFromFile: "选择文件",
      changeFile: "更换文件",
      selected: "已选择",
      menuLink: "菜单网页或分享链接",
      analyzeMenu: "分析菜单",
      analyzing: "正在分析...",
      noInput: "请选择文件、拍照，或输入链接。",
      startFileFailed: "无法开始解析文件",
      startUrlFailed: "无法开始解析链接",
      noTask: "服务器没有返回解析任务。",
      timeout: "解析仍在进行，请稍后再试。",
      statusFailed: "无法检查解析状态",
      parseFailed: "服务器解析失败",
      noHash: "解析结果没有返回菜单哈希。",
      unknownError: "分析时发生错误。",
      ad: "广告",
    },
    footer: {
      privacy: "隐私政策",
      deletion: "删除账号",
      rights: "保留所有权利。",
    },
  },
  "zh-Hant": {
    metaTitle: "AIMenuAPP - 翻譯菜單，輕鬆點餐",
    nav: {
      language: "選擇頁面語言",
      share: "分享",
      history: "歷史",
      cart: "購物車",
      account: "帳號",
    },
    home: {
      kicker: "開始翻譯",
      titleLines: ["翻譯菜單，", "輕鬆點餐"],
      subtitle: "上傳照片、PDF、網站或外送分享連結，快速取得清楚的菜名、描述和配料。",
      steps: ["照片/PDF/網頁", "AI 翻譯", "準備點餐", "智慧推薦"],
    },
    features: {
      title: "核心功能",
      subtitle: "智慧 AI 菜單翻譯器幫助你在世界各地看懂當地菜色。",
      cards: [
        { title: "菜單翻譯", desc: "支援英語、中文和西班牙語菜單互譯。" },
        { title: "詳細說明", desc: "解釋陌生菜色、配料和口味。" },
        { title: "輕鬆點餐", desc: "整理清楚的點餐清單，方便給服務員查看。" },
        { title: "多種菜單來源", desc: "照片、PDF 和菜單連結都走同一套後端解析流程。" },
      ],
    },
    result: {
      backHome: "返回首頁",
      restaurantMenu: "餐廳菜單",
      loading: "載入中",
      dishes: "道菜",
      loadingResult: "正在載入菜單結果...",
      noItems: "沒有找到菜單項目。",
      notAvailable: "菜單結果暫時不可用，請稍後重新整理。",
      other: "其他",
      unnamedDish: "未命名菜色",
    },
    analyzer: {
      sourceLanguage: "源語言",
      targetLanguage: "目標語言",
      autoDetect: "自動識別",
      takePicture: "拍照",
      changePicture: "更換照片",
      selectFromFile: "選擇檔案",
      changeFile: "更換檔案",
      selected: "已選擇",
      menuLink: "菜單網頁或分享連結",
      analyzeMenu: "分析菜單",
      analyzing: "正在分析...",
      noInput: "請選擇檔案、拍照，或輸入連結。",
      startFileFailed: "無法開始解析檔案",
      startUrlFailed: "無法開始解析連結",
      noTask: "伺服器沒有返回解析任務。",
      timeout: "解析仍在進行，請稍後再試。",
      statusFailed: "無法檢查解析狀態",
      parseFailed: "伺服器解析失敗",
      noHash: "解析結果沒有返回菜單雜湊。",
      unknownError: "分析時發生錯誤。",
      ad: "廣告",
    },
    footer: {
      privacy: "隱私政策",
      deletion: "刪除帳號",
      rights: "保留所有權利。",
    },
  },
  es: {
    metaTitle: "AIMenuAPP - Traduce menús y pide con facilidad",
    nav: {
      language: "Seleccionar idioma de la página",
      share: "Compartir",
      history: "Historial",
      cart: "Carrito",
      account: "Cuenta",
    },
    home: {
      kicker: "Empieza a traducir",
      titleLines: ["Traduce menús,", "pide con facilidad"],
      subtitle: "Sube fotos, PDF, sitios web o enlaces de delivery para ver nombres, descripciones e ingredientes claros.",
      steps: ["Fotos/PDF/Web", "Traducción AI", "Listo para pedir", "Sugerencias AI"],
    },
    features: {
      title: "Funciones clave",
      subtitle: "Tu traductor inteligente de menús te ayuda a entender platos locales en cualquier lugar.",
      cards: [
        { title: "Traducir menús", desc: "Traduce menús entre inglés, chino y español." },
        { title: "Descripciones claras", desc: "Obtén explicaciones de platos e ingredientes desconocidos." },
        { title: "Pide con facilidad", desc: "Crea una lista clara de platos para mostrar al camarero." },
        { title: "Todo tipo de menús", desc: "Fotos, PDF y enlaces de menú usan el mismo parser backend." },
      ],
    },
    result: {
      backHome: "Volver al inicio",
      restaurantMenu: "Menú del restaurante",
      loading: "Cargando",
      dishes: "platos",
      loadingResult: "Cargando resultado del menú...",
      noItems: "No se encontraron platos.",
      notAvailable: "El resultado del menú aún no está disponible. Actualiza en un momento.",
      other: "Otros",
      unnamedDish: "Plato sin nombre",
    },
    analyzer: {
      sourceLanguage: "Idioma original",
      targetLanguage: "Idioma objetivo",
      autoDetect: "Detectar automáticamente",
      takePicture: "Tomar foto",
      changePicture: "Cambiar foto",
      selectFromFile: "Seleccionar archivo",
      changeFile: "Cambiar archivo",
      selected: "Seleccionado",
      menuLink: "Página del menú o enlace compartido",
      analyzeMenu: "Analizar menú",
      analyzing: "Analizando...",
      noInput: "Selecciona un archivo, toma una foto o introduce una URL.",
      startFileFailed: "No se pudo iniciar el análisis del archivo",
      startUrlFailed: "No se pudo iniciar el análisis de la URL",
      noTask: "El servidor no devolvió una tarea de análisis.",
      timeout: "El análisis sigue en curso. Inténtalo de nuevo en un momento.",
      statusFailed: "No se pudo comprobar el estado del análisis",
      parseFailed: "El análisis falló en el servidor",
      noHash: "El resultado no contiene un hash de menú.",
      unknownError: "Ocurrió un error durante el análisis.",
      ad: "Anuncio",
    },
    footer: {
      privacy: "Política de privacidad",
      deletion: "Eliminar cuenta",
      rights: "Todos los derechos reservados.",
    },
  },
};

export function getText(lang: WebLanguageCode) {
  return webText[normalizeLanguage(lang)];
}
