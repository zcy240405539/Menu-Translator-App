"use client";

import Image from "next/image";
import Link from "next/link";
import { Globe } from "lucide-react";
import {
  LANGUAGES,
  normalizeLanguage,
  saveLanguage,
  type Catalog,
  type WebLanguageCode,
} from "@/lib/i18n";
import { PUBLISHER_PAGES, type PublisherPageKey } from "@/lib/publisherPages";
import { languageQuery, localizedPublicPath } from "@/lib/seo";

export default function ContentPageHeader({
  lang,
  text,
  currentPage,
  onLanguageChange,
}: {
  lang: WebLanguageCode;
  text: Catalog;
  currentPage?: PublisherPageKey;
  onLanguageChange?: (language: string) => void;
}) {
  const query = languageQuery(lang);
  const currentRoute = PUBLISHER_PAGES.find(({ key }) => key === currentPage)?.href || "/";

  const changeLanguage = (language: string) => {
    if (onLanguageChange) {
      onLanguageChange(language);
      return;
    }
    const normalized = normalizeLanguage(language);
    saveLanguage(normalized);
    window.location.assign(localizedPublicPath(currentRoute, normalized));
  };

  return (
    <header className="border-b border-purple-100 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <Link href={localizedPublicPath("/", lang)} className="flex items-center gap-3 rounded-md hover:opacity-85">
          <Image src="/ai-menu-logo.png" alt="" width={38} height={38} className="scale-150 object-contain" priority />
          <span className="font-extrabold text-[#5f259f]">{text.common.brand}</span>
        </Link>
        <label className="relative flex h-10 items-center gap-2 rounded-md border border-purple-100 bg-purple-50 px-3 text-sm font-semibold text-purple-800">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{text.nav.language}</span>
          <select
            aria-label={text.nav.language}
            className="absolute inset-0 cursor-pointer opacity-0"
            value={lang}
            onChange={(event) => changeLanguage(event.target.value)}
          >
            {LANGUAGES.map((option) => (
              <option key={option.code} value={option.code}>{text.languageNames[option.code]}</option>
            ))}
          </select>
        </label>
      </div>
      <nav aria-label={text.publisher.navigation} className="mx-auto flex max-w-5xl gap-x-5 gap-y-2 overflow-x-auto px-4 pb-4 text-sm font-semibold text-gray-700">
        {PUBLISHER_PAGES.map(({ key, href }) => (
          <Link key={href} href={localizedPublicPath(href, lang)} prefetch={false} className={`shrink-0 hover:text-purple-700 ${key === currentPage ? "text-purple-700" : ""}`}>
            {text.publisher.nav[key]}
          </Link>
        ))}
        <Link href={`/privacy-policy${query}`} prefetch={false} className="shrink-0 hover:text-purple-700">{text.footer.privacy}</Link>
        <Link href={`/terms-of-service${query}`} prefetch={false} className="shrink-0 hover:text-purple-700">{text.footer.terms}</Link>
      </nav>
    </header>
  );
}
