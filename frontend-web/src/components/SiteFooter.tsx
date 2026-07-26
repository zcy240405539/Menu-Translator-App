"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdSenseSlot } from "@/components/ads/AdSenseSlot";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_CHANGE_EVENT,
  getInitialLanguage,
  getText,
  normalizeLanguage,
  type WebLanguageCode,
} from "@/lib/i18n";

function currentLanguage() {
  const queryLanguage = new URLSearchParams(window.location.search).get("lang");
  return normalizeLanguage(queryLanguage || getInitialLanguage());
}

export default function SiteFooter() {
  const [lang, setLang] = useState<WebLanguageCode>(DEFAULT_LANGUAGE);

  useEffect(() => {
    const syncLanguage = (event?: Event) => {
      const eventLanguage = event instanceof CustomEvent ? event.detail : null;
      setLang(eventLanguage ? normalizeLanguage(eventLanguage) : currentLanguage());
    };
    queueMicrotask(syncLanguage);
    window.addEventListener("popstate", syncLanguage);
    window.addEventListener("storage", syncLanguage);
    window.addEventListener(LANGUAGE_CHANGE_EVENT, syncLanguage);
    return () => {
      window.removeEventListener("popstate", syncLanguage);
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener(LANGUAGE_CHANGE_EVENT, syncLanguage);
    };
  }, []);

  const text = getText(lang);
  const langQuery = `?lang=${encodeURIComponent(lang)}`;
  const bannerSlot = process.env.NEXT_PUBLIC_ADSENSE_BANNER_SLOT
    || process.env.NEXT_PUBLIC_ADSENSE_ANALYZE_SLOT;

  return (
    <>
      <aside className="w-full border-t border-purple-100 bg-white px-4 py-4" aria-label={text.analyzer.ad}>
        <div className="container mx-auto max-w-6xl">
          <AdSenseSlot
            slot={bannerSlot}
            format="horizontal"
            className="min-h-24 rounded-xl border border-purple-100 bg-purple-50/30 p-3"
            label={text.analyzer.ad}
          />
        </div>
      </aside>
      <footer className="w-full border-t bg-gray-50 py-8 text-gray-500">
        <div className="container mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 md:flex-row">
          <span className="text-lg font-bold text-gray-700">AI Menu APP</span>
          <p className="text-sm">© {new Date().getFullYear()} AI Menu APP. {text.footer.rights}</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link href={`/settings${langQuery}`} className="text-sm transition-colors hover:text-purple-600">
              {text.footer.settings}
            </Link>
            <Link href={`/privacy-policy${langQuery}`} className="text-sm transition-colors hover:text-purple-600">
              {text.footer.privacy}
            </Link>
            <Link href={`/terms-of-service${langQuery}`} className="text-sm transition-colors hover:text-purple-600">
              {text.footer.terms}
            </Link>
            <Link href={`/account-deletion${langQuery}`} className="text-sm transition-colors hover:text-purple-600">
              {text.footer.deletion}
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
