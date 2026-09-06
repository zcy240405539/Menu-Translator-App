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
  const allCodes = [
    "en", "es", "fr", "de", "it",
    "pt", "ru", "ja", "zh-cn", "ko",
    "ar", "hi", "th", "vi", "tr"
  ];

  return (
    <div className="mt-12 mb-12 border-y border-purple-100 py-10">
      <div className="mb-12 text-center">
        <h2 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {text.publisher.nav.languages || "Supported Languages"}
        </h2>
        <p className="mx-auto max-w-[700px] text-lg text-gray-600">
          {text.features?.subtitle || "AnyMenu's powerful menu translator supports over 50 languages, helping you translate menus from around the world and order with ease."}
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {allCodes.map((code, idx) => {
          let name = "";
          if (["hi", "th", "vi", "tr"].includes(code)) {
            // @ts-ignore
            name = text.languageNamesExtra?.[code] || code;
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
          {/* @ts-ignore */}
          {text.languageNamesExtra?.more || "+ 35 more"}
        </div>
      </div>
    </div>
  );
}
