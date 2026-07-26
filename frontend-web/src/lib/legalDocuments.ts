import type { WebLanguageCode } from "@/lib/i18n";

export type LegalKind = "privacy" | "terms";

type LegalDocument = {
  title: string;
  intro: string;
  sections: { heading: string; items: string[] }[];
};

const documents: { en: Record<LegalKind, LegalDocument> }
  & Partial<Record<WebLanguageCode, Record<LegalKind, LegalDocument>>> = {
  en: {
    privacy: {
      title: "Privacy Policy",
      intro: "AI Menu APP translates and explains restaurant menus. This policy describes the information we process, why we use it, and the choices available to you.",
      sections: [
        { heading: "Information we process", items: [
          "Account details such as username, email, optional phone number, authentication identifiers, profile preferences, and avatar.",
          "Menus and related content you submit, including photos, PDFs, documents, text, webpages, and delivery-app links.",
          "Generated translations, dish details, recommendations, menu history, order-list items, app interactions, diagnostics, and device or advertising identifiers.",
        ]},
        { heading: "How we use information", items: [
          "To provide OCR, translation, menu organization, dish explanations, image matching, recommendations, sharing, history, and order-list features.",
          "To authenticate accounts, save preferences, maintain security, prevent abuse, troubleshoot errors, improve reliability, and measure advertising where enabled.",
        ]},
        { heading: "Service providers", items: [
          "Depending on enabled features, data may be processed by Supabase, Render, Google Cloud, Gemini, OpenRouter, OpenAI, Pexels, Unsplash, Wikimedia Commons, Google AdSense, and Google AdMob.",
          "Menu content is sent to AI and cloud services only as needed to provide the requested feature. Each provider processes data under its own terms and privacy practices.",
        ]},
        { heading: "Retention and security", items: [
          "We retain account data while your account is active and keep cached or diagnostic data only as reasonably needed for the service, security, legal obligations, and performance.",
          "We use reasonable safeguards, but no internet service can guarantee absolute security.",
        ]},
        { heading: "Your choices and children", items: [
          "You may use supported guest features, update profile preferences, manage available ad controls, request account deletion, and contact us about privacy questions.",
          "The service is not directed to children under 13. We may update this policy and will provide notice when required.",
        ]},
      ],
    },
    terms: {
      title: "Terms of Service",
      intro: "These Terms govern your use of AI Menu APP. By using the service, you agree to these Terms.",
      sections: [
        { heading: "The service", items: [
          "AI Menu APP uses OCR, translation, search, and AI systems to help users understand restaurant menus. Features may change, be interrupted, or be discontinued.",
          "You must provide accurate account information and are responsible for activity under your account.",
        ]},
        { heading: "AI and translation limitations", items: [
          "Translations, prices, ingredients, dietary labels, images, and recommendations may be incomplete or incorrect.",
          "Always confirm menu details, current prices, availability, and ordering information with the restaurant.",
        ]},
        { heading: "Allergy and health notice", items: [
          "AI Menu APP does not provide medical advice and cannot guarantee that a dish is free of allergens or suitable for a diet.",
          "For allergies or medical restrictions, contact the restaurant and a qualified healthcare professional before ordering.",
        ]},
        { heading: "Your content and acceptable use", items: [
          "You keep ownership of content you submit and grant us a limited license to process it only to operate, secure, and improve the requested service.",
          "Do not upload content you lack permission to use, misuse the service, attempt unauthorized access, disrupt systems, or use the service unlawfully.",
        ]},
        { heading: "Ads, accounts, and liability", items: [
          "The service may display advertising. If paid features are offered, pricing and purchase terms will be shown before payment. Accounts that violate these Terms may be suspended.",
          "The service is provided as available. To the extent permitted by law, we are not responsible for indirect losses or decisions made solely from AI-generated menu information.",
          "We may update these Terms. Continued use after an update means you accept the revised Terms.",
        ]},
      ],
    },
  },
  "zh-cn": {
    privacy: {
      title: "隐私政策",
      intro: "AI Menu APP 用于翻译和解释餐厅菜单。本政策说明我们处理哪些信息、使用目的以及您可以进行的选择。",
      sections: [
        { heading: "我们处理的信息", items: [
          "账号资料，例如用户名、电子邮箱、可选电话号码、身份验证标识、个人偏好和头像。",
          "您提交的菜单及相关内容，包括照片、PDF、文档、文字、网页和外卖应用链接。",
          "生成的翻译、菜品详情、推荐、菜单历史、待点列表，以及应用交互、诊断和设备或广告标识。",
        ]},
        { heading: "信息用途", items: [
          "提供 OCR、翻译、菜单分类、菜品说明、图片匹配、智能推荐、分享、历史和待点列表功能。",
          "验证账号、保存偏好、维护安全、防止滥用、排查错误、改进可靠性，并在启用广告时衡量广告。",
        ]},
        { heading: "服务提供商", items: [
          "根据启用的功能，数据可能由 Supabase、Render、Google Cloud、Gemini、OpenRouter、OpenAI、Pexels、Unsplash、Wikimedia Commons、Google AdSense 和 Google AdMob 处理。",
          "菜单内容只会在提供所请求功能所需范围内发送给 AI 和云服务。各服务商依据自己的条款和隐私规则处理数据。",
        ]},
        { heading: "保留与安全", items: [
          "账号有效期间我们会保留账号数据；缓存或诊断数据仅在服务、安全、法律义务和性能所合理需要的期限内保留。",
          "我们采取合理的安全措施，但任何互联网服务都无法保证绝对安全。",
        ]},
        { heading: "您的选择与儿童保护", items: [
          "您可以使用支持的访客功能、修改个人偏好、管理可用的广告控制、请求删除账号并联系我们处理隐私问题。",
          "本服务不面向13岁以下儿童。我们可能更新本政策，并在需要时提供通知。",
        ]},
      ],
    },
    terms: {
      title: "服务条款",
      intro: "本条款适用于您对 AI Menu APP 的使用。使用本服务即表示您同意本条款。",
      sections: [
        { heading: "服务内容", items: [
          "AI Menu APP 使用 OCR、翻译、搜索和 AI 系统帮助用户理解餐厅菜单。功能可能变更、中断或停止。",
          "您应提供准确的账号信息，并对账号下的活动负责。",
        ]},
        { heading: "AI 与翻译限制", items: [
          "翻译、价格、配料、饮食标签、图片和推荐可能不完整或不准确。",
          "请始终向餐厅确认菜单内容、当前价格、供应情况和点餐信息。",
        ]},
        { heading: "过敏与健康提示", items: [
          "AI Menu APP 不提供医疗建议，也不能保证菜品不含过敏原或适合特定饮食。",
          "如有过敏或医疗限制，请在点餐前联系餐厅并咨询合格的医疗专业人士。",
        ]},
        { heading: "您的内容与合理使用", items: [
          "您保留所提交内容的所有权，并授予我们仅为运行、保护和改进所请求服务而处理该内容的有限许可。",
          "请勿上传无权使用的内容、滥用服务、尝试未经授权的访问、干扰系统或将服务用于违法目的。",
        ]},
        { heading: "广告、账号与责任", items: [
          "服务可能展示广告。如果提供付费功能，我们会在付款前显示价格和购买条款。违反本条款的账号可能被暂停。",
          "服务按现状提供。在法律允许范围内，我们不对间接损失或仅依据 AI 菜单信息作出的决定承担责任。",
          "我们可能更新本条款。更新后继续使用即表示接受修订后的条款。",
        ]},
      ],
    },
  },
  "zh-Hant": {
    privacy: {
      title: "隱私政策",
      intro: "AI Menu APP 用於翻譯和解釋餐廳菜單。本政策說明我們處理哪些資訊、使用目的以及您可以進行的選擇。",
      sections: [
        { heading: "我們處理的資訊", items: [
          "帳號資料，例如使用者名稱、電子郵件、可選電話號碼、驗證識別碼、個人偏好和頭像。",
          "您提交的菜單及相關內容，包括照片、PDF、文件、文字、網頁和外送應用程式連結。",
          "產生的翻譯、菜品詳情、推薦、菜單歷史、待點列表，以及應用程式互動、診斷和裝置或廣告識別碼。",
        ]},
        { heading: "資訊用途", items: [
          "提供 OCR、翻譯、菜單分類、菜品說明、圖片配對、智慧推薦、分享、歷史和待點列表功能。",
          "驗證帳號、儲存偏好、維護安全、防止濫用、排查錯誤、改善可靠性，並在啟用廣告時衡量廣告。",
        ]},
        { heading: "服務提供者", items: [
          "根據啟用的功能，資料可能由 Supabase、Render、Google Cloud、Gemini、OpenRouter、OpenAI、Pexels、Unsplash、Wikimedia Commons、Google AdSense 和 Google AdMob 處理。",
          "菜單內容只會在提供所要求功能所需範圍內傳送給 AI 和雲端服務。各服務商依自己的條款和隱私規則處理資料。",
        ]},
        { heading: "保留與安全", items: [
          "帳號有效期間我們會保留帳號資料；快取或診斷資料僅在服務、安全、法律義務和效能所合理需要的期間內保留。",
          "我們採取合理的安全措施，但任何網際網路服務都無法保證絕對安全。",
        ]},
        { heading: "您的選擇與兒童保護", items: [
          "您可以使用支援的訪客功能、修改個人偏好、管理可用的廣告控制、要求刪除帳號並聯絡我們處理隱私問題。",
          "本服務不面向13歲以下兒童。我們可能更新本政策，並在需要時提供通知。",
        ]},
      ],
    },
    terms: {
      title: "服務條款",
      intro: "本條款適用於您對 AI Menu APP 的使用。使用本服務即表示您同意本條款。",
      sections: [
        { heading: "服務內容", items: [
          "AI Menu APP 使用 OCR、翻譯、搜尋和 AI 系統協助使用者理解餐廳菜單。功能可能變更、中斷或停止。",
          "您應提供準確的帳號資訊，並對帳號下的活動負責。",
        ]},
        { heading: "AI 與翻譯限制", items: [
          "翻譯、價格、配料、飲食標籤、圖片和推薦可能不完整或不準確。",
          "請一律向餐廳確認菜單內容、目前價格、供應情況和點餐資訊。",
        ]},
        { heading: "過敏與健康提示", items: [
          "AI Menu APP 不提供醫療建議，也不能保證菜品不含過敏原或適合特定飲食。",
          "如有過敏或醫療限制，請在點餐前聯絡餐廳並諮詢合格的醫療專業人士。",
        ]},
        { heading: "您的內容與合理使用", items: [
          "您保留所提交內容的所有權，並授予我們僅為運行、保護和改善所要求服務而處理該內容的有限授權。",
          "請勿上傳無權使用的內容、濫用服務、嘗試未經授權的存取、干擾系統或將服務用於違法目的。",
        ]},
        { heading: "廣告、帳號與責任", items: [
          "服務可能展示廣告。如果提供付費功能，我們會在付款前顯示價格和購買條款。違反本條款的帳號可能被暫停。",
          "服務按現狀提供。在法律允許範圍內，我們不對間接損失或僅依據 AI 菜單資訊作出的決定承擔責任。",
          "我們可能更新本條款。更新後繼續使用即表示接受修訂後的條款。",
        ]},
      ],
    },
  },
  es: {
    privacy: {
      title: "Política de privacidad",
      intro: "AI Menu APP traduce y explica menús de restaurantes. Esta política describe la información que procesamos, por qué la usamos y las opciones disponibles.",
      sections: [
        { heading: "Información que procesamos", items: [
          "Datos de la cuenta, como nombre de usuario, correo electrónico, teléfono opcional, identificadores de autenticación, preferencias y avatar.",
          "Menús y contenido que envías, incluidas fotos, PDF, documentos, texto, páginas web y enlaces de aplicaciones de entrega.",
          "Traducciones, detalles, recomendaciones, historial y listas generadas, además de interacciones, diagnósticos e identificadores del dispositivo o publicidad.",
        ]},
        { heading: "Cómo usamos la información", items: [
          "Para ofrecer OCR, traducción, organización del menú, explicaciones, imágenes, recomendaciones, funciones para compartir, historial y lista de pedidos.",
          "Para autenticar cuentas, guardar preferencias, mantener la seguridad, prevenir abusos, corregir errores, mejorar la fiabilidad y medir anuncios cuando estén habilitados.",
        ]},
        { heading: "Proveedores de servicios", items: [
          "Según las funciones habilitadas, Supabase, Render, Google Cloud, Gemini, OpenRouter, OpenAI, Pexels, Unsplash, Wikimedia Commons, Google AdSense y Google AdMob pueden procesar datos.",
          "El contenido del menú se envía a servicios de IA y nube solo cuando es necesario. Cada proveedor aplica sus propios términos y políticas.",
        ]},
        { heading: "Conservación y seguridad", items: [
          "Conservamos los datos de la cuenta mientras esté activa y los datos de caché o diagnóstico solo durante el tiempo razonablemente necesario para el servicio, la seguridad y obligaciones legales.",
          "Aplicamos medidas razonables, pero ningún servicio de Internet puede garantizar seguridad absoluta.",
        ]},
        { heading: "Tus opciones y menores", items: [
          "Puedes usar funciones compatibles como invitado, actualizar preferencias, gestionar controles publicitarios, solicitar la eliminación de tu cuenta y contactarnos sobre privacidad.",
          "El servicio no está dirigido a menores de 13 años. Podemos actualizar esta política y avisaremos cuando sea necesario.",
        ]},
      ],
    },
    terms: {
      title: "Términos del servicio",
      intro: "Estos Términos rigen el uso de AI Menu APP. Al utilizar el servicio, aceptas estos Términos.",
      sections: [
        { heading: "El servicio", items: [
          "AI Menu APP usa OCR, traducción, búsqueda e IA para ayudar a entender menús. Las funciones pueden cambiar, interrumpirse o dejar de estar disponibles.",
          "Debes proporcionar datos de cuenta correctos y eres responsable de la actividad de tu cuenta.",
        ]},
        { heading: "Limitaciones de IA y traducción", items: [
          "Las traducciones, precios, ingredientes, etiquetas dietéticas, imágenes y recomendaciones pueden estar incompletos o ser incorrectos.",
          "Confirma siempre con el restaurante los detalles, precios actuales, disponibilidad e información del pedido.",
        ]},
        { heading: "Aviso sobre alergias y salud", items: [
          "AI Menu APP no ofrece asesoramiento médico ni garantiza que un plato no contenga alérgenos o sea apto para una dieta.",
          "Para alergias o restricciones médicas, consulta al restaurante y a un profesional sanitario antes de pedir.",
        ]},
        { heading: "Tu contenido y uso aceptable", items: [
          "Conservas la propiedad del contenido enviado y nos das una licencia limitada para procesarlo con el fin de operar, proteger y mejorar el servicio solicitado.",
          "No subas contenido sin permiso, abuses del servicio, intentes acceder sin autorización, interrumpas sistemas ni uses el servicio ilegalmente.",
        ]},
        { heading: "Anuncios, cuentas y responsabilidad", items: [
          "El servicio puede mostrar publicidad. Si se ofrecen funciones de pago, el precio y las condiciones se mostrarán antes de pagar. Las cuentas que infrinjan estos Términos pueden suspenderse.",
          "El servicio se ofrece según disponibilidad. En la medida permitida por la ley, no respondemos por pérdidas indirectas ni decisiones basadas únicamente en información generada por IA.",
          "Podemos actualizar estos Términos. El uso continuado implica la aceptación de los Términos revisados.",
        ]},
      ],
    },
  },
};

export function getLegalDocument(lang: WebLanguageCode, kind: LegalKind) {
  return documents[lang]?.[kind] || documents.en[kind];
}
