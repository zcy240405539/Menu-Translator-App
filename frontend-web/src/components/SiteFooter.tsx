"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useText } from "@/hooks/useText";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_CHANGE_EVENT,
  applyDocumentLanguage,
  getPageLanguage,
  normalizeLanguage,
  type WebLanguageCode,
} from "@/lib/i18n";
import { PUBLISHER_PAGES } from "@/lib/publisherPages";

export default function SiteFooter() {
  const [lang, setLang] = useState<WebLanguageCode>(DEFAULT_LANGUAGE);

  useEffect(() => {
    const syncLanguage = (event?: Event) => {
      const eventLanguage = event instanceof CustomEvent ? event.detail : null;
      const nextLanguage = eventLanguage ? normalizeLanguage(eventLanguage) : getPageLanguage();
      applyDocumentLanguage(nextLanguage);
      setLang(nextLanguage);
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

  const text = useText(lang);
  const langQuery = `?lang=${encodeURIComponent(lang)}`;

  return (
    <footer data-site-footer className="w-full border-t bg-gray-50 py-8 text-gray-500">
      <div className="container mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 md:flex-row">
        <p className="text-sm">© {new Date().getFullYear()} {text.common.brand}. {text.footer.rights}</p>
        <nav aria-label={text.publisher.navigation} className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          {PUBLISHER_PAGES.map(({ href, key }) => (
            <Link key={href} href={`${href}${langQuery}`} className="text-sm transition-colors hover:text-purple-600">
              {text.publisher.nav[key]}
            </Link>
          ))}
            <Link href={`/privacy-policy${langQuery}`} className="text-sm transition-colors hover:text-purple-600">
              {text.footer.privacy}
            </Link>
            <Link href={`/terms-of-service${langQuery}`} className="text-sm transition-colors hover:text-purple-600">
              {text.footer.terms}
            </Link>
        </nav>
      </div>
    </footer>
  );
}
