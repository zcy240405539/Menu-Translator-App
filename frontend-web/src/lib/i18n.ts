export type WebLanguageCode = "en" | "zh-cn" | "zh-Hant" | "es";

const STORAGE_KEY = "menu_app_language";

export const DEFAULT_LANGUAGE: WebLanguageCode = "en";

export const LANGUAGES: { code: WebLanguageCode; label: string; shortLabel: string }[] = [
  { code: "en", label: "English", shortLabel: "English" },
  { code: "zh-cn", label: "Chinese-Simplified", shortLabel: "Chinese" },
  { code: "zh-Hant", label: "Chinese-Traditional", shortLabel: "Chinese" },
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

export function languageLabel(uiLang: WebLanguageCode, lang: string) {
  return webText[normalizeLanguage(uiLang)].languageNames[normalizeLanguage(lang)];
}

export function languageShortLabel(uiLang: WebLanguageCode, lang: string) {
  return webText[normalizeLanguage(uiLang)].languageShortNames[normalizeLanguage(lang)];
}

export function sourceLanguageLabel(uiLang: WebLanguageCode, lang: string, compact = false) {
  if (lang === "auto") return webText[normalizeLanguage(uiLang)].analyzer.autoDetect;
  return compact ? languageShortLabel(uiLang, lang) : languageLabel(uiLang, lang);
}

export const webText = {
  en: {
    metaTitle: "AI Menu APP - Translate Menus & Order with Ease",
    languageNames: {
      en: "English",
      "zh-cn": "Chinese-Simplified",
      "zh-Hant": "Chinese-Traditional",
      es: "Spanish",
    },
    languageShortNames: {
      en: "English",
      "zh-cn": "Chinese",
      "zh-Hant": "Chinese",
      es: "Spanish",
    },
    nav: {
      language: "Select page language",
      share: "Share",
      shareMessage: "Translate and understand menus with AI Menu APP.",
      history: "History",
      cart: "Cart",
      account: "Account",
      accountLoginFailed: "Unable to open sign in. Please try again.",
    },
    home: {
      kicker: "Start for free",
      titleLines: ["Translate menus,", "order with ease"],
      subtitle: "Upload photos, PDFs, websites, or delivery app links to get clear dish names, descriptions, and ingredients.",
      steps: ["Photos/PDF/Web", "AI Translation", "Order Ready", "Smart Suggestions"],
    },
    auth: {
      title: "Sign in",
      subtitle: "Sign in to save menu history and order lists.",
      email: "Email",
      password: "Password",
      signIn: "Sign in",
      signingIn: "Signing in...",
      google: "Continue with Google",
      backHome: "Back to home",
      missingFields: "Please enter your email and password.",
      loginFailed: "Sign in failed. Please check your email and password.",
      googleFailed: "Unable to open Google sign in.",
      signedIn: "Signed in. Redirecting...",
    },
    saved: {
      loading: "Loading...",
      signInPrompt: "Sign in to view saved items.",
      emptyHistory: "No saved menu history yet.",
      emptyCart: "Your order list is empty.",
      openMenu: "Open menu",
      quantity: "Qty",
      updated: "Updated",
      loadFailed: "Unable to load saved items.",
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
      recommendLink: "AI Smart Recommendation",
      close: "Close",
      detailLoading: "Loading details...",
      imagePending: "Preparing image",
      description: "Description",
      ingredients: "Ingredients",
      allergens: "Allergens",
      spicyLevel: "Spicy Level",
      unknown: "Unknown",
      none: "None",
      addToCart: "Add to order list",
      addedToCart: "Added",
      recommendationTitle: "AI Smart Recommendation",
      peopleLabel: "Number of people",
      peoplePlaceholder: "e.g., 2",
      dietLabel: "Dietary constraints",
      budgetLabel: "Budget",
      budgetPlaceholder: "e.g., $50 or no limit",
      allergiesLabel: "Food allergies",
      allergiesPlaceholder: "e.g., peanuts, seafood",
      tasteLabel: "Taste preference",
      tastePlaceholder: "e.g., spicy, mild, less salt",
      generateRecommendation: "Generate recommendation",
      generatingRecommendation: "Generating...",
      recommendationSummary: "Recommendation",
      recommendedDishes: "Recommended dishes",
      recommendationError: "Failed to generate recommendation. Please try again.",
      dietOptions: {
        Vegetarian: "Vegetarian",
        Halal: "Halal",
        Kosher: "Kosher",
        Keto: "Keto",
        "Gluten-Free": "Gluten-Free",
      },
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
    legal: {
      back: "Back to AI Menu APP",
      brand: "AI Menu APP",
      contact: "Contact",
      privacy: {
        title: "Privacy Policy",
        subtitle: "AI Menu APP - Last updated: June 10, 2026",
        intro:
          "AI Menu APP helps users translate and understand restaurant menus from photos, files, documents, and menu links. This Privacy Policy explains what information we collect, how we use it, and the choices available to users.",
        sections: [
          {
            heading: "Information we collect",
            items: [
              "Account information, such as username, email address, optional phone number, and authentication identifiers.",
              "Profile preferences, such as dietary preferences, allergies, budget, and taste preferences when users choose to provide them.",
              "User-provided menu content, including menu photos, PDFs, documents, text, webpages, and delivery app share links.",
              "Generated menu results, including translated dish names, descriptions, ingredients, allergens, prices, menu history, and order list items.",
              "Technical data such as app interactions, diagnostics, device or advertising identifiers, and network request metadata.",
            ],
          },
          {
            heading: "How we use information",
            items: [
              "To provide menu OCR, translation, dish explanation, image matching, and AI recommendation features.",
              "To save account profiles, menu history, and order list data for signed-in users.",
              "To improve reliability, prevent abuse, debug errors, and maintain app security.",
              "To show advertising and measure ad performance where ads are enabled.",
              "To respond to support, account deletion, and privacy requests.",
            ],
          },
          {
            heading: "Third-party services",
            items: [
              "The app may process data through service providers used for hosting, database storage, authentication, AI model processing, image retrieval, analytics, and advertising.",
              "These providers may include Render, Supabase, OpenRouter, OpenAI, Google AdSense, Google AdMob, Pexels, Unsplash, and Wikimedia Commons depending on enabled features.",
            ],
          },
          {
            heading: "Your choices",
            items: [
              "You can avoid signing in and use supported features without an account where available.",
              "You can request account deletion at /account-deletion.",
              "You can contact us for privacy questions or deletion requests.",
            ],
          },
        ],
      },
      deletion: {
        title: "Delete your AI Menu APP account",
        subtitle: "Request deletion of your account and associated account data.",
        emailButton: "Email account deletion request",
        sections: [
          {
            heading: "How to request deletion",
            items: [
              "Send the request from the email address registered with your account.",
              "Include your registered email and username if available.",
              "We will verify the request and process account deletion.",
            ],
          },
          {
            heading: "Data deleted",
            items: [
              "Account profile data, authentication account, avatar, saved menu history, profile preferences, and saved order list data associated with the account will be deleted where technically feasible.",
            ],
          },
          {
            heading: "Data that may be retained",
            items: [
              "We may retain security logs, transaction records required by law, and anonymized or non-user-linked menu, dish, and image cache data that is no longer associated with your account.",
            ],
          },
        ],
      },
    },
  },
  "zh-cn": {
    metaTitle: "AI Menu APP - 翻译菜单，轻松点餐",
    languageNames: {
      en: "英语",
      "zh-cn": "中文-简体",
      "zh-Hant": "中文-繁体",
      es: "西班牙语",
    },
    languageShortNames: {
      en: "英语",
      "zh-cn": "中文",
      "zh-Hant": "中文",
      es: "西班牙语",
    },
    nav: {
      language: "选择页面语言",
      share: "分享",
      shareMessage: "使用 AI Menu APP 翻译并看懂菜单。",
      history: "历史",
      cart: "购物车",
      account: "账号",
      accountLoginFailed: "无法打开登录，请稍后再试。",
    },
    home: {
      kicker: "免费开始使用",
      titleLines: ["翻译菜单，", "轻松点餐"],
      subtitle: "上传照片、PDF、网站或外卖分享链接，快速获得清晰的菜名、描述和配料。",
      steps: ["照片/PDF/网页", "AI 翻译", "准备点餐", "智能推荐"],
    },
    auth: {
      title: "登录",
      subtitle: "登录后可以保存菜单历史和点餐清单。",
      email: "邮箱",
      password: "密码",
      signIn: "登录",
      signingIn: "正在登录...",
      google: "使用 Google 继续",
      backHome: "返回首页",
      missingFields: "请输入邮箱和密码。",
      loginFailed: "登录失败，请检查邮箱和密码。",
      googleFailed: "无法打开 Google 登录。",
      signedIn: "已登录，正在跳转...",
    },
    saved: {
      loading: "正在加载...",
      signInPrompt: "请先登录以查看保存的内容。",
      emptyHistory: "还没有保存的菜单历史。",
      emptyCart: "点餐清单为空。",
      openMenu: "打开菜单",
      quantity: "数量",
      updated: "更新于",
      loadFailed: "无法加载保存内容。",
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
      recommendLink: "AI 智能推荐",
      close: "关闭",
      detailLoading: "正在加载详情...",
      imagePending: "正在准备图片",
      description: "菜品说明",
      ingredients: "配料",
      allergens: "过敏原",
      spicyLevel: "辣度",
      unknown: "未知",
      none: "无",
      addToCart: "加入点餐清单",
      addedToCart: "已加入",
      recommendationTitle: "AI 智能推荐",
      peopleLabel: "用餐人数",
      peoplePlaceholder: "例如：2",
      dietLabel: "饮食限制",
      budgetLabel: "预算",
      budgetPlaceholder: "例如：50 美元或不限",
      allergiesLabel: "食物过敏",
      allergiesPlaceholder: "例如：花生、海鲜",
      tasteLabel: "口味偏好",
      tastePlaceholder: "例如：微辣、清淡、少盐",
      generateRecommendation: "生成推荐",
      generatingRecommendation: "正在生成...",
      recommendationSummary: "推荐方案",
      recommendedDishes: "推荐菜品",
      recommendationError: "生成推荐失败，请稍后再试。",
      dietOptions: {
        Vegetarian: "素食",
        Halal: "清真",
        Kosher: "犹太洁食",
        Keto: "生酮",
        "Gluten-Free": "无麸质",
      },
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
    legal: {
      back: "返回 AI Menu APP",
      brand: "AI Menu APP",
      contact: "联系邮箱",
      privacy: {
        title: "隐私政策",
        subtitle: "AI Menu APP - 最后更新：2026 年 6 月 10 日",
        intro:
          "AI Menu APP 帮助用户通过照片、文件、文档和菜单链接翻译并理解餐厅菜单。本隐私政策说明我们收集哪些信息、如何使用这些信息，以及用户可以做出的选择。",
        sections: [
          {
            heading: "我们收集的信息",
            items: [
              "账号信息，例如用户名、电子邮件地址、可选电话号码和身份验证标识。",
              "用户主动提供的资料偏好，例如饮食偏好、过敏信息、预算和口味偏好。",
              "用户提供的菜单内容，包括菜单照片、PDF、文档、文本、网页和外卖应用分享链接。",
              "生成的菜单结果，包括翻译后的菜名、描述、配料、过敏原、价格、菜单历史和点餐清单项目。",
              "技术数据，例如应用交互、诊断信息、设备或广告标识符，以及网络请求元数据。",
            ],
          },
          {
            heading: "我们如何使用信息",
            items: [
              "提供菜单 OCR、翻译、菜品解释、图片匹配和 AI 推荐功能。",
              "为登录用户保存账号资料、菜单历史和点餐清单数据。",
              "提升可靠性、防止滥用、调试错误并维护应用安全。",
              "在启用广告时展示广告并衡量广告效果。",
              "回应客服、账号删除和隐私相关请求。",
            ],
          },
          {
            heading: "第三方服务",
            items: [
              "应用可能会通过托管、数据库存储、身份验证、AI 模型处理、图片检索、分析和广告等服务商处理数据。",
              "这些服务商可能包括 Render、Supabase、OpenRouter、OpenAI、Google AdSense、Google AdMob、Pexels、Unsplash 和 Wikimedia Commons，具体取决于启用的功能。",
            ],
          },
          {
            heading: "你的选择",
            items: [
              "在可用情况下，你可以不登录账号使用支持的功能。",
              "你可以在 /account-deletion 请求删除账号。",
              "你可以联系我们咨询隐私问题或账号删除请求。",
            ],
          },
        ],
      },
      deletion: {
        title: "删除你的 AI Menu APP 账号",
        subtitle: "请求删除你的账号及相关账号数据。",
        emailButton: "发送账号删除请求邮件",
        sections: [
          {
            heading: "如何请求删除",
            items: [
              "请使用注册账号的电子邮件地址发送请求。",
              "请包含你的注册邮箱和用户名（如果知道）。",
              "我们会验证请求并处理账号删除。",
            ],
          },
          {
            heading: "将删除的数据",
            items: [
              "在技术可行范围内，我们会删除与该账号关联的账号资料、身份验证账号、头像、已保存菜单历史、个人偏好和已保存点餐清单数据。",
            ],
          },
          {
            heading: "可能保留的数据",
            items: [
              "我们可能保留安全日志、法律要求的交易记录，以及不再与你账号关联的匿名或非用户关联菜单、菜品和图片缓存数据。",
            ],
          },
        ],
      },
    },
  },
  "zh-Hant": {
    metaTitle: "AI Menu APP - 翻譯菜單，輕鬆點餐",
    languageNames: {
      en: "英語",
      "zh-cn": "中文-簡體",
      "zh-Hant": "中文-繁體",
      es: "西班牙語",
    },
    languageShortNames: {
      en: "英語",
      "zh-cn": "中文",
      "zh-Hant": "中文",
      es: "西班牙語",
    },
    nav: {
      language: "選擇頁面語言",
      share: "分享",
      shareMessage: "使用 AI Menu APP 翻譯並看懂菜單。",
      history: "歷史",
      cart: "購物車",
      account: "帳號",
      accountLoginFailed: "無法開啟登入，請稍後再試。",
    },
    home: {
      kicker: "免費開始使用",
      titleLines: ["翻譯菜單，", "輕鬆點餐"],
      subtitle: "上傳照片、PDF、網站或外送分享連結，快速取得清楚的菜名、描述和配料。",
      steps: ["照片/PDF/網頁", "AI 翻譯", "準備點餐", "智慧推薦"],
    },
    auth: {
      title: "登入",
      subtitle: "登入後可以保存菜單歷史和點餐清單。",
      email: "信箱",
      password: "密碼",
      signIn: "登入",
      signingIn: "正在登入...",
      google: "使用 Google 繼續",
      backHome: "返回首頁",
      missingFields: "請輸入信箱和密碼。",
      loginFailed: "登入失敗，請檢查信箱和密碼。",
      googleFailed: "無法開啟 Google 登入。",
      signedIn: "已登入，正在跳轉...",
    },
    saved: {
      loading: "正在載入...",
      signInPrompt: "請先登入以查看保存的內容。",
      emptyHistory: "還沒有保存的菜單歷史。",
      emptyCart: "點餐清單為空。",
      openMenu: "開啟菜單",
      quantity: "數量",
      updated: "更新於",
      loadFailed: "無法載入保存內容。",
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
      recommendLink: "AI 智慧推薦",
      close: "關閉",
      detailLoading: "正在載入詳情...",
      imagePending: "正在準備圖片",
      description: "菜色說明",
      ingredients: "配料",
      allergens: "過敏原",
      spicyLevel: "辣度",
      unknown: "未知",
      none: "無",
      addToCart: "加入點餐清單",
      addedToCart: "已加入",
      recommendationTitle: "AI 智慧推薦",
      peopleLabel: "用餐人數",
      peoplePlaceholder: "例如：2",
      dietLabel: "飲食限制",
      budgetLabel: "預算",
      budgetPlaceholder: "例如：50 美元或不限",
      allergiesLabel: "食物過敏",
      allergiesPlaceholder: "例如：花生、海鮮",
      tasteLabel: "口味偏好",
      tastePlaceholder: "例如：微辣、清淡、少鹽",
      generateRecommendation: "生成推薦",
      generatingRecommendation: "正在生成...",
      recommendationSummary: "推薦方案",
      recommendedDishes: "推薦菜色",
      recommendationError: "生成推薦失敗，請稍後再試。",
      dietOptions: {
        Vegetarian: "素食",
        Halal: "清真",
        Kosher: "猶太潔食",
        Keto: "生酮",
        "Gluten-Free": "無麩質",
      },
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
    legal: {
      back: "返回 AI Menu APP",
      brand: "AI Menu APP",
      contact: "聯絡信箱",
      privacy: {
        title: "隱私政策",
        subtitle: "AI Menu APP - 最後更新：2026 年 6 月 10 日",
        intro:
          "AI Menu APP 幫助使用者透過照片、檔案、文件和菜單連結翻譯並理解餐廳菜單。本隱私政策說明我們收集哪些資訊、如何使用這些資訊，以及使用者可以做出的選擇。",
        sections: [
          {
            heading: "我們收集的資訊",
            items: [
              "帳號資訊，例如使用者名稱、電子郵件地址、可選電話號碼和身分驗證識別碼。",
              "使用者主動提供的資料偏好，例如飲食偏好、過敏資訊、預算和口味偏好。",
              "使用者提供的菜單內容，包括菜單照片、PDF、文件、文字、網頁和外送應用分享連結。",
              "生成的菜單結果，包括翻譯後的菜名、描述、配料、過敏原、價格、菜單歷史和點餐清單項目。",
              "技術資料，例如應用互動、診斷資訊、裝置或廣告識別碼，以及網路請求中繼資料。",
            ],
          },
          {
            heading: "我們如何使用資訊",
            items: [
              "提供菜單 OCR、翻譯、菜色解釋、圖片匹配和 AI 推薦功能。",
              "為登入使用者保存帳號資料、菜單歷史和點餐清單資料。",
              "提升可靠性、防止濫用、偵錯並維護應用安全。",
              "在啟用廣告時展示廣告並衡量廣告效果。",
              "回應客服、帳號刪除和隱私相關請求。",
            ],
          },
          {
            heading: "第三方服務",
            items: [
              "應用可能會透過託管、資料庫儲存、身分驗證、AI 模型處理、圖片檢索、分析和廣告等服務商處理資料。",
              "這些服務商可能包括 Render、Supabase、OpenRouter、OpenAI、Google AdSense、Google AdMob、Pexels、Unsplash 和 Wikimedia Commons，具體取決於啟用的功能。",
            ],
          },
          {
            heading: "你的選擇",
            items: [
              "在可用情況下，你可以不登入帳號使用支援的功能。",
              "你可以在 /account-deletion 請求刪除帳號。",
              "你可以聯絡我們諮詢隱私問題或帳號刪除請求。",
            ],
          },
        ],
      },
      deletion: {
        title: "刪除你的 AI Menu APP 帳號",
        subtitle: "請求刪除你的帳號及相關帳號資料。",
        emailButton: "傳送帳號刪除請求郵件",
        sections: [
          {
            heading: "如何請求刪除",
            items: [
              "請使用註冊帳號的電子郵件地址傳送請求。",
              "請包含你的註冊信箱和使用者名稱（如果知道）。",
              "我們會驗證請求並處理帳號刪除。",
            ],
          },
          {
            heading: "將刪除的資料",
            items: [
              "在技術可行範圍內，我們會刪除與該帳號關聯的帳號資料、身分驗證帳號、頭像、已保存菜單歷史、個人偏好和已保存點餐清單資料。",
            ],
          },
          {
            heading: "可能保留的資料",
            items: [
              "我們可能保留安全日誌、法律要求的交易記錄，以及不再與你帳號關聯的匿名或非使用者關聯菜單、菜色和圖片快取資料。",
            ],
          },
        ],
      },
    },
  },
  es: {
    metaTitle: "AI Menu APP - Traduce menús y pide con facilidad",
    languageNames: {
      en: "Inglés",
      "zh-cn": "Chino simplificado",
      "zh-Hant": "Chino tradicional",
      es: "Español",
    },
    languageShortNames: {
      en: "Inglés",
      "zh-cn": "Chino",
      "zh-Hant": "Chino",
      es: "Español",
    },
    nav: {
      language: "Seleccionar idioma de la página",
      share: "Compartir",
      shareMessage: "Traduce y entiende menús con AI Menu APP.",
      history: "Historial",
      cart: "Carrito",
      account: "Cuenta",
      accountLoginFailed: "No se pudo abrir el inicio de sesión. Inténtalo de nuevo.",
    },
    home: {
      kicker: "Empieza gratis",
      titleLines: ["Traduce menús,", "pide con facilidad"],
      subtitle: "Sube fotos, PDF, sitios web o enlaces de delivery para ver nombres, descripciones e ingredientes claros.",
      steps: ["Fotos/PDF/Web", "Traducción AI", "Listo para pedir", "Sugerencias AI"],
    },
    auth: {
      title: "Iniciar sesión",
      subtitle: "Inicia sesión para guardar historial de menús y listas de pedido.",
      email: "Correo electrónico",
      password: "Contraseña",
      signIn: "Iniciar sesión",
      signingIn: "Iniciando sesión...",
      google: "Continuar con Google",
      backHome: "Volver al inicio",
      missingFields: "Introduce tu correo y contraseña.",
      loginFailed: "No se pudo iniciar sesión. Revisa tu correo y contraseña.",
      googleFailed: "No se pudo abrir el inicio de sesión con Google.",
      signedIn: "Sesión iniciada. Redirigiendo...",
    },
    saved: {
      loading: "Cargando...",
      signInPrompt: "Inicia sesión para ver elementos guardados.",
      emptyHistory: "Aún no hay historial de menús guardado.",
      emptyCart: "Tu lista de pedido está vacía.",
      openMenu: "Abrir menú",
      quantity: "Cant.",
      updated: "Actualizado",
      loadFailed: "No se pudieron cargar los elementos guardados.",
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
      recommendLink: "Recomendación AI",
      close: "Cerrar",
      detailLoading: "Cargando detalles...",
      imagePending: "Preparando imagen",
      description: "Descripción",
      ingredients: "Ingredientes",
      allergens: "Alérgenos",
      spicyLevel: "Nivel de picante",
      unknown: "Desconocido",
      none: "Ninguno",
      addToCart: "Añadir a la lista",
      addedToCart: "Añadido",
      recommendationTitle: "Recomendación AI",
      peopleLabel: "Número de personas",
      peoplePlaceholder: "ej., 2",
      dietLabel: "Restricciones dietéticas",
      budgetLabel: "Presupuesto",
      budgetPlaceholder: "ej., $50 o sin límite",
      allergiesLabel: "Alergias alimentarias",
      allergiesPlaceholder: "ej., maní, mariscos",
      tasteLabel: "Preferencia de sabor",
      tastePlaceholder: "ej., picante, suave, menos sal",
      generateRecommendation: "Generar recomendación",
      generatingRecommendation: "Generando...",
      recommendationSummary: "Recomendación",
      recommendedDishes: "Platos recomendados",
      recommendationError: "No se pudo generar la recomendación. Inténtalo de nuevo.",
      dietOptions: {
        Vegetarian: "Vegetariano",
        Halal: "Halal",
        Kosher: "Kosher",
        Keto: "Keto",
        "Gluten-Free": "Sin gluten",
      },
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
    legal: {
      back: "Volver a AI Menu APP",
      brand: "AI Menu APP",
      contact: "Contacto",
      privacy: {
        title: "Política de privacidad",
        subtitle: "AI Menu APP - Última actualización: 10 de junio de 2026",
        intro:
          "AI Menu APP ayuda a los usuarios a traducir y entender menús de restaurantes desde fotos, archivos, documentos y enlaces de menú. Esta Política de privacidad explica qué información recopilamos, cómo la usamos y qué opciones tienen los usuarios.",
        sections: [
          {
            heading: "Información que recopilamos",
            items: [
              "Información de cuenta, como nombre de usuario, correo electrónico, teléfono opcional e identificadores de autenticación.",
              "Preferencias de perfil, como dieta, alergias, presupuesto y gustos cuando el usuario decide proporcionarlas.",
              "Contenido de menú proporcionado por el usuario, incluidas fotos, PDF, documentos, texto, páginas web y enlaces compartidos de apps de delivery.",
              "Resultados generados del menú, incluidos nombres traducidos, descripciones, ingredientes, alérgenos, precios, historial y artículos de lista de pedido.",
              "Datos técnicos como interacciones de la app, diagnósticos, identificadores de dispositivo o publicidad y metadatos de solicitudes de red.",
            ],
          },
          {
            heading: "Cómo usamos la información",
            items: [
              "Para ofrecer OCR de menús, traducción, explicación de platos, coincidencia de imágenes y recomendaciones con AI.",
              "Para guardar perfiles, historial de menús y listas de pedido de usuarios registrados.",
              "Para mejorar la fiabilidad, prevenir abuso, depurar errores y mantener la seguridad de la app.",
              "Para mostrar anuncios y medir su rendimiento cuando los anuncios están habilitados.",
              "Para responder a solicitudes de soporte, eliminación de cuenta y privacidad.",
            ],
          },
          {
            heading: "Servicios de terceros",
            items: [
              "La app puede procesar datos mediante proveedores de alojamiento, almacenamiento de base de datos, autenticación, modelos de AI, búsqueda de imágenes, analítica y publicidad.",
              "Estos proveedores pueden incluir Render, Supabase, OpenRouter, OpenAI, Google AdSense, Google AdMob, Pexels, Unsplash y Wikimedia Commons, según las funciones habilitadas.",
            ],
          },
          {
            heading: "Tus opciones",
            items: [
              "Puedes usar funciones compatibles sin crear una cuenta cuando estén disponibles.",
              "Puedes solicitar la eliminación de la cuenta en /account-deletion.",
              "Puedes contactarnos para preguntas de privacidad o solicitudes de eliminación.",
            ],
          },
        ],
      },
      deletion: {
        title: "Eliminar tu cuenta de AI Menu APP",
        subtitle: "Solicita la eliminación de tu cuenta y los datos asociados.",
        emailButton: "Enviar solicitud de eliminación por correo",
        sections: [
          {
            heading: "Cómo solicitar la eliminación",
            items: [
              "Envía la solicitud desde el correo electrónico registrado en tu cuenta.",
              "Incluye tu correo registrado y tu nombre de usuario si lo conoces.",
              "Verificaremos la solicitud y procesaremos la eliminación de la cuenta.",
            ],
          },
          {
            heading: "Datos eliminados",
            items: [
              "Cuando sea técnicamente posible, se eliminarán los datos de perfil, cuenta de autenticación, avatar, historial guardado, preferencias y lista de pedido guardada asociados con la cuenta.",
            ],
          },
          {
            heading: "Datos que pueden conservarse",
            items: [
              "Podemos conservar registros de seguridad, registros de transacciones requeridos por ley y datos anonimizados o no vinculados al usuario sobre menús, platos e imágenes en caché.",
            ],
          },
        ],
      },
    },
  },
};

export function getText(lang: WebLanguageCode) {
  return webText[normalizeLanguage(lang)];
}
