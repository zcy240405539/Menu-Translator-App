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
      heroKicker: "Start translating",
      heroTitle: "Translate menus, order with ease",
      heroSubtitle:
        "Upload photos, PDFs, websites, or delivery app links to get clear dish names, descriptions, and ingredients.",
      featureDocuments: "Photos, PDFs, websites",
      featureTranslation: "AI dish translation",
      featureOrderList: "Order list ready",
      toolKicker: "Upload menu",
      toolTitle: "Start with your menu",
      targetLanguage: "Target language",
      sourceLanguage: "Source language",
      autoDetect: "Auto Detect",
      english: "English",
      chinese: "Simplified Chinese",
      traditionalChinese: "Traditional Chinese",
      takePicture: "Take Picture",
      selectFromFile: "Select from File",
      menuUrlLabel: "Menu webpage or share link",
      menuUrlPlaceholder: "Paste a Yelp, DoorDash, Uber Eats, or menu URL",
      selectedMenu: "Selected Menu",
      pdfMenu: "PDF Menu",
      documentMenu: "Document Menu",
      pdfFileSelected: "PDF file selected",
      documentFileSelected: "Document file selected",
      fileSelectionFailed: "File selection failed",
      analyzeMenu: "Analyze Menu",
      analyzingMenu: "Analyzing menu...",
      noMenuTitle: "No Menu",
      noMenuMessage: "Please take a picture or select a menu file first.",
      noUrlTitle: "No Link",
      noUrlMessage: "Please paste a menu webpage or delivery app share link first.",
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

    auth: {
      resetPasswordTitle: "Reset Password",
      signInTitle: "Sign In",
      signUpTitle: "Create Account",
      email: "Email",
      password: "Password",
      confirmPassword: "Confirm Password",
      username: "Username",
      phone: "Phone (Optional)",
      loginBtn: "Sign In",
      registerBtn: "Sign Up",
      switchRegister: "Don't have an account? Sign Up",
      switchLogin: "Already have an account? Sign In",
      googleLogin: "Continue with Google",
      prefTitle: "Dietary & Health Profile (Optional)",
      diets: "Dietary Habits",
      allergies: "Food Allergies (comma separated)",
      allergiesPlaceholder: "e.g., peanut, seafood",
      budget: "Dining Budget",
      budgetPlaceholder: "e.g., $50",
      taste: "Taste Preference",
      tastePlaceholder: "e.g., spicy, light",
      errorMatch: "Passwords do not match",
      requiredFields: "Please fill in all required fields",
      forgotPasswordLink: "Forgot Password?",
      resetBtn: "Send Reset Email",
      resetSuccess: "Password reset email sent, please check your inbox",
      backToLogin: "Back to Sign In",
      resetInstruction: "Enter your email to receive a password reset link",
      mediaLibraryPermission: "Permission to access media library is required",
      avatarSuccess: "Avatar updated successfully!",
      avatarFail: "Avatar upload failed. Please try again later.",
    },

    profile: {
      title: "Profile Settings",
      username: "Username",
      email: "Email",
      phone: "Phone Number",
      saveBtn: "Save Changes",
      logoutBtn: "Sign Out",
      diets: "Dietary Constraints",
      allergies: "Food Allergies",
      allergiesPlaceholder: "e.g., peanut, seafood",
      budget: "Dining Budget",
      budgetPlaceholder: "e.g., $50",
      taste: "Taste Preference",
      tastePlaceholder: "e.g., spicy, light",
      successMsg: "Profile updated successfully!",
      avatarTip: "Tap avatar to change",
      deleteAccountLink: "Delete account",
      deleteAccountHelp: "Need to delete your account? Open the deletion request page.",
      deleteAccountOpenFailed: "Unable to open account deletion page.",
    },
  },

  zh: {
    appTitle: "AI菜单助手",

    home: {
      heroKicker: "开始翻译",
      heroTitle: "看懂菜单，轻松点餐",
      heroSubtitle: "上传照片、PDF、菜单网页或外卖分享链接，快速获得菜名、描述和食材说明。",
      featureDocuments: "支持照片、PDF、网页",
      featureTranslation: "AI 菜品翻译",
      featureOrderList: "待点列表同步",
      toolKicker: "上传菜单",
      toolTitle: "从菜单开始",
      targetLanguage: "目标语言",
      sourceLanguage: "菜单原语言",
      autoDetect: "自动识别",
      english: "English",
      chinese: "简体中文",
      traditionalChinese: "繁体中文",
      takePicture: "拍照识别",
      selectFromFile: "从文件选择",
      menuUrlLabel: "菜单网页或分享链接",
      menuUrlPlaceholder: "粘贴 Yelp、DoorDash、Uber Eats 或菜单链接",
      selectedMenu: "已选择菜单",
      pdfMenu: "PDF 菜单",
      documentMenu: "文档菜单",
      pdfFileSelected: "已选择 PDF 文件",
      documentFileSelected: "已选择文档文件",
      fileSelectionFailed: "文件选择失败",
      analyzeMenu: "分析菜单",
      analyzingMenu: "正在分析菜单...",
      noMenuTitle: "未选择菜单",
      noMenuMessage: "请先拍摄或选择一个菜单文件。",
      noUrlTitle: "未输入链接",
      noUrlMessage: "请先粘贴菜单网页或外卖 App 分享链接。",
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

    auth: {
      resetPasswordTitle: "重置密码",
      signInTitle: "登录账户",
      signUpTitle: "注册新账号",
      email: "电子邮箱",
      password: "密码",
      confirmPassword: "确认密码",
      username: "用户名",
      phone: "手机号 (选填)",
      loginBtn: "登 录",
      registerBtn: "注 册",
      switchRegister: "还没有账号？去注册",
      switchLogin: "已有账号？去登录",
      googleLogin: "使用 Google 账号快捷登录",
      prefTitle: "个性化饮食与健康偏好 (选填)",
      diets: "饮食限制",
      allergies: "食物过敏原 (逗号分隔)",
      allergiesPlaceholder: "如：花生, 海鲜",
      budget: "日常预算",
      budgetPlaceholder: "如：50",
      taste: "口味偏好",
      tastePlaceholder: "如：清淡、少油",
      errorMatch: "两次密码不一致",
      requiredFields: "请填写所有必填项",
      forgotPasswordLink: "忘记密码？",
      resetBtn: "发送重置邮件",
      resetSuccess: "重置邮件已发送，请检查您的邮箱",
      backToLogin: "返回登录",
      resetInstruction: "请输入您的注册邮箱接收密码重置链接",
      mediaLibraryPermission: "需要媒体库权限才能更换头像",
      avatarSuccess: "头像已成功上传并更新！",
      avatarFail: "上传头像失败，请稍后重试。",
    },

    profile: {
      title: "个人中心",
      username: "用户名",
      email: "电子邮箱",
      phone: "手机号",
      saveBtn: "保存修改",
      logoutBtn: "退出登录",
      diets: "饮食限制",
      allergies: "过敏原",
      allergiesPlaceholder: "例如：花生, 海鲜",
      budget: "预算限制",
      budgetPlaceholder: "例如：50 或 无限制",
      taste: "口味偏好",
      tastePlaceholder: "例如：清淡、微辣、少油",
      successMsg: "个人信息已成功更新！",
      avatarTip: "点击头像可更换",
      deleteAccountLink: "删除账号",
      deleteAccountHelp: "需要删除账号？打开账号删除申请页面。",
      deleteAccountOpenFailed: "无法打开账号删除页面。",
    },
  },

  "zh-Hant": {
    appTitle: "AI菜單助手",

    home: {
      heroKicker: "開始翻譯",
      heroTitle: "看懂菜單，輕鬆點餐",
      heroSubtitle: "上傳照片、PDF、菜單網頁或外送分享連結，快速獲得菜名、描述和食材說明。",
      featureDocuments: "支援照片、PDF、網頁",
      featureTranslation: "AI 菜品翻譯",
      featureOrderList: "待點清單同步",
      toolKicker: "上傳菜單",
      toolTitle: "從菜單開始",
      targetLanguage: "目標語言",
      sourceLanguage: "菜單原語言",
      autoDetect: "自動識別",
      english: "English",
      chinese: "簡體中文",
      traditionalChinese: "繁體中文",
      takePicture: "拍照識別",
      selectFromFile: "從檔案選擇",
      menuUrlLabel: "菜單網頁或分享連結",
      menuUrlPlaceholder: "貼上 Yelp、DoorDash、Uber Eats 或菜單連結",
      selectedMenu: "已選擇菜單",
      pdfMenu: "PDF 菜單",
      documentMenu: "文件菜單",
      pdfFileSelected: "已選擇 PDF 檔案",
      documentFileSelected: "已選擇文件檔案",
      fileSelectionFailed: "檔案選擇失敗",
      analyzeMenu: "分析菜單",
      analyzingMenu: "正在分析菜單...",
      noMenuTitle: "未選擇菜單",
      noMenuMessage: "請先拍攝或選擇一個菜單檔案。",
      noUrlTitle: "未輸入連結",
      noUrlMessage: "請先貼上菜單網頁或外送 App 分享連結。",
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

    auth: {
      resetPasswordTitle: "重設密碼",
      signInTitle: "登入帳戶",
      signUpTitle: "註冊新帳號",
      email: "電子郵件",
      password: "密碼",
      confirmPassword: "確認密碼",
      username: "用戶名",
      phone: "手機號 (選填)",
      loginBtn: "登 入",
      registerBtn: "註 冊",
      switchRegister: "還沒有帳號？去註冊",
      switchLogin: "已有帳號？去登入",
      googleLogin: "使用 Google 帳號快捷登入",
      prefTitle: "個性化飲食與健康偏好 (選填)",
      diets: "飲食限制",
      allergies: "食物過敏原 (逗號分隔)",
      allergiesPlaceholder: "如：花生, 海鮮",
      budget: "日常預算",
      budgetPlaceholder: "如：50",
      taste: "口味偏好",
      tastePlaceholder: "如：清淡、少油",
      errorMatch: "兩次密碼不一致",
      requiredFields: "請填寫所有必填項",
      forgotPasswordLink: "忘記密碼？",
      resetBtn: "發送重設郵件",
      resetSuccess: "重設郵件已發送，請檢查您的信箱",
      backToLogin: "返回登入",
      resetInstruction: "請輸入您的註冊信箱接收密碼重設連結",
      mediaLibraryPermission: "需要媒體庫權限才能更換頭像",
      avatarSuccess: "頭像已成功上傳並更新！",
      avatarFail: "上傳頭像失敗，請稍後重試。",
    },

    profile: {
      title: "個人中心",
      username: "用戶名",
      email: "電子郵件",
      phone: "手機號",
      saveBtn: "保存修改",
      logoutBtn: "退出登錄",
      diets: "飲食限制",
      allergies: "過敏原",
      allergiesPlaceholder: "例如：花生, 海鮮",
      budget: "預算限制",
      budgetPlaceholder: "例如：50 或 無限制",
      taste: "口味偏好",
      tastePlaceholder: "例如：清淡、微辣、少油",
      successMsg: "個人資訊已成功更新！",
      avatarTip: "點擊頭像可更換",
      deleteAccountLink: "刪除帳號",
      deleteAccountHelp: "需要刪除帳號？打開帳號刪除申請頁面。",
      deleteAccountOpenFailed: "無法打開帳號刪除頁面。",
    },
  },

  es: {
    appTitle: "Asistente de Menú IA",

    home: {
      heroKicker: "Comenzar traducción",
      heroTitle: "Traduce menús y pide con facilidad",
      heroSubtitle:
        "Sube fotos, PDFs, sitios web o enlaces de apps de comida para ver nombres, descripciones e ingredientes claros.",
      featureDocuments: "Fotos, PDFs, sitios web",
      featureTranslation: "Traducción de platos con IA",
      featureOrderList: "Lista de pedido lista",
      toolKicker: "Subir menú",
      toolTitle: "Empieza con tu menú",
      targetLanguage: "Idioma destino",
      sourceLanguage: "Idioma origen",
      autoDetect: "Detectar automáticamente",
      english: "English",
      chinese: "Chino Simplificado",
      traditionalChinese: "Chino Tradicional",
      takePicture: "Tomar Foto",
      selectFromFile: "Seleccionar de Archivo",
      menuUrlLabel: "Página o enlace compartido del menú",
      menuUrlPlaceholder: "Pega un enlace de Yelp, DoorDash, Uber Eats o menú",
      selectedMenu: "Menú Seleccionado",
      pdfMenu: "Menú en PDF",
      documentMenu: "Menú en Documento",
      pdfFileSelected: "Archivo PDF seleccionado",
      documentFileSelected: "Archivo de documento seleccionado",
      fileSelectionFailed: "Fallo al seleccionar archivo",
      analyzeMenu: "Analizar Menú",
      analyzingMenu: "Analizando menú...",
      noMenuTitle: "Sin Menú",
      noMenuMessage: "Tome una foto o seleccione un archivo de menú primero.",
      noUrlTitle: "Sin Enlace",
      noUrlMessage: "Pegue primero una página de menú o enlace compartido de una app de comida.",
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

    auth: {
      resetPasswordTitle: "Restablecer contraseña",
      signInTitle: "Iniciar sesión",
      signUpTitle: "Crear cuenta",
      email: "Correo electrónico",
      password: "Contraseña",
      confirmPassword: "Confirmar contraseña",
      username: "Nombre de usuario",
      phone: "Teléfono (Opcional)",
      loginBtn: "Iniciar sesión",
      registerBtn: "Registrarse",
      switchRegister: "¿No tienes una cuenta? Regístrate",
      switchLogin: "¿Ya tienes una cuenta? Inicia sesión",
      googleLogin: "Continuar con Google",
      prefTitle: "Perfil Dietético y de Salud (Opcional)",
      diets: "Hábitos Alimenticios",
      allergies: "Alergias Alimentarias (separadas por comas)",
      allergiesPlaceholder: "ej., maní, mariscos",
      budget: "Presupuesto Diario",
      budgetPlaceholder: "ej., 50",
      taste: "Preferencia de Sabor",
      tastePlaceholder: "ej., picante, suave",
      errorMatch: "Las contraseñas no coinciden",
      requiredFields: "Por favor complete todos los campos obligatorios",
      forgotPasswordLink: "¿Olvidaste tu contraseña?",
      resetBtn: "Enviar correo de restablecimiento",
      resetSuccess: "Correo enviado, por favor revise su bandeja de entrada",
      backToLogin: "Volver a iniciar sesión",
      resetInstruction: "Ingrese su correo electrónico para recibir un enlace de restablecimiento",
      mediaLibraryPermission: "Se requiere permiso de galería para cambiar el avatar",
      avatarSuccess: "¡Avatar subido y actualizado con éxito!",
      avatarFail: "Error al subir el avatar, inténtelo de nuevo más tarde.",
    },

    profile: {
      title: "Configuración de Perfil",
      username: "Nombre de usuario",
      email: "Correo electrónico",
      phone: "Número de teléfono",
      saveBtn: "Guardar cambios",
      logoutBtn: "Cerrar sesión",
      diets: "Restricciones Dietéticas",
      allergies: "Alergias Alimentarias",
      allergiesPlaceholder: "ej., maní, mariscos",
      budget: "Presupuesto",
      budgetPlaceholder: "ej., 50 o Sin Límite",
      taste: "Preferencia de Sabor",
      tastePlaceholder: "ej., picante, ligero",
      successMsg: "¡Perfil actualizado con éxito!",
      avatarTip: "Toca el avatar para cambiar",
      deleteAccountLink: "Eliminar cuenta",
      deleteAccountHelp: "¿Necesitas eliminar tu cuenta? Abre la página de solicitud de eliminación.",
      deleteAccountOpenFailed: "No se pudo abrir la página de eliminación de cuenta.",
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
