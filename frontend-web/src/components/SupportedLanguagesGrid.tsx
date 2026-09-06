import { WebLanguageCode, Catalog } from "@/lib/i18n";

const COLORS = [
  "bg-indigo-50 text-indigo-600",
  "bg-green-50 text-green-600",
  "bg-blue-50 text-blue-600",
  "bg-orange-50 text-orange-600",
  "bg-emerald-50 text-emerald-600",
  "bg-emerald-50 text-emerald-600",
  "bg-indigo-50 text-indigo-600",
  "bg-orange-50 text-orange-600",
  "bg-green-50 text-green-600",
  "bg-indigo-50 text-indigo-600",
  "bg-orange-50 text-orange-600",
  "bg-green-50 text-green-600",
  "bg-indigo-50 text-indigo-600",
  "bg-orange-50 text-orange-600",
];

export function SupportedLanguagesGrid({ text }: { text: Catalog }) {
  // Show specific languages in order from the screenshot
  const displayCodes: WebLanguageCode[] = [
    "en", "es", "fr", "de", "it",
    "pt", "ru", "ja", "zh-cn", "ko",
    "ar"
  ];
  // Wait, the screenshot has:
  // English, Spanish, French, German, Italian
  // Portuguese, Russian, Japanese, Chinese, Korean
  // Arabic, Hindi, Thai, Vietnamese, Turkish
  // +35 more.
  
  // Actually, I can just use our LANGUAGES array if I want, or just hardcode the display codes.
  const allCodes = [
    "en", "es", "fr", "de", "it",
    "pt", "ru", "ja", "zh-cn", "ko",
    "ar", "hi", "th", "vi", "tr"
  ];

  return (
    <div className="mt-12 mb-12 border-y border-purple-100 py-10">
      <div className="text-center mb-8">
        <h3 className="text-3xl font-bold text-[#34A853] mb-3">{text.publisher.nav.languages || "Supported Languages"}</h3>
        <p className="text-gray-600 max-w-2xl mx-auto">
          {text.features?.subtitle || "AnyMenu's powerful menu translator supports over 50 languages, helping you translate menus from around the world and order with ease."}
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {allCodes.map((code, idx) => {
          // If language is not in our WebLanguageCode but we want to show it:
          // We can fallback to English names if not present in translation
          let name = "";
          if (["hi", "th", "vi", "tr"].includes(code)) {
            const extra: Record<string, string> = { hi: "Hindi", th: "Thai", vi: "Vietnamese", tr: "Turkish" };
            name = extra[code];
          } else {
            name = text.languageNames[code as WebLanguageCode] || code;
          }
          return (
            <div key={code} className={`flex items-center justify-center py-3 px-4 rounded-xl text-sm font-medium ${COLORS[idx % COLORS.length]}`}>
              {name}
            </div>
          );
        })}
        <div className="flex items-center justify-center py-3 px-4 rounded-xl text-sm font-medium bg-indigo-50 text-indigo-600">
          + 35 more
        </div>
      </div>
    </div>
  );
}
