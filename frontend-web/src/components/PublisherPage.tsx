"use client";

import Image from "next/image";
import Link from "next/link";
import { Globe, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { useText } from "@/hooks/useText";
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  applyDocumentLanguage,
  getPageLanguage,
  languageLabel,
  replacePageLanguage,
  type WebLanguageCode,
} from "@/lib/i18n";
import { PUBLISHER_PAGES, type PublisherPageKey } from "@/lib/publisherPages";

const SUPPORT_EMAIL = "support@aimenu.us.kg";

export default function PublisherPage({ pageKey }: { pageKey: PublisherPageKey }) {
  const [lang, setLang] = useState<WebLanguageCode>(DEFAULT_LANGUAGE);
  const text = useText(lang);
  const publisher = text.publisher;
  const page = publisher.pages[pageKey];
  const pageRoute = PUBLISHER_PAGES.find(({ key }) => key === pageKey)?.href || "/";
  const canonicalUrl = `https://aimenu.us.kg${pageRoute}/`;
  const langQuery = `?lang=${encodeURIComponent(lang)}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: page.title,
        description: page.summary,
        inLanguage: lang,
        mainEntityOfPage: canonicalUrl,
        author: { "@type": "Organization", name: text.common.brand, url: "https://aimenu.us.kg/" },
        publisher: { "@type": "Organization", name: text.common.brand, url: "https://aimenu.us.kg/" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: text.common.brand, item: "https://aimenu.us.kg/" },
          { "@type": "ListItem", position: 2, name: page.title, item: canonicalUrl },
        ],
      },
    ],
  };

  useEffect(() => {
    queueMicrotask(() => {
      const nextLanguage = getPageLanguage();
      setLang(nextLanguage);
      applyDocumentLanguage(nextLanguage);
    });
  }, [pageKey]);

  useEffect(() => {
    applyDocumentLanguage(lang);
    const localizedTitle = `${page.title} | ${text.common.brand}`;
    const updateTitle = () => {
      if (document.title !== localizedTitle) document.title = localizedTitle;
    };
    updateTitle();
    const observer = new MutationObserver(updateTitle);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [lang, page.title, text.common.brand]);

  const changeLanguage = (nextLanguage: string) => {
    const normalized = replacePageLanguage(nextLanguage);
    setLang(normalized);
    applyDocumentLanguage(normalized);
  };

  return (
    <main className="min-h-screen bg-[#fbf8f4] text-gray-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <header className="border-b border-purple-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <Link href={`/${langQuery}`} className="flex items-center gap-3 rounded-md hover:opacity-85">
            <Image src="/ai-menu-logo.png" alt="" width={38} height={38} className="rounded-md" priority />
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
                <option key={option.code} value={option.code}>{languageLabel(lang, option.code)}</option>
              ))}
            </select>
          </label>
        </div>
        <nav aria-label={publisher.navigation} className="mx-auto flex max-w-5xl gap-x-5 gap-y-2 overflow-x-auto px-4 pb-4 text-sm font-semibold text-gray-700">
          {PUBLISHER_PAGES.map(({ key, href }) => (
            <Link key={href} href={`${href}${langQuery}`} className={`shrink-0 hover:text-purple-700 ${key === pageKey ? "text-purple-700" : ""}`}>
              {publisher.nav[key]}
            </Link>
          ))}
        </nav>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-12 md:py-16">
        <p className="text-sm font-bold uppercase text-purple-700">{publisher.resourceLabel}</p>
        <h1 className="mt-3 text-4xl font-extrabold leading-tight md:text-5xl">{page.title}</h1>
        <p className="mt-6 text-xl leading-8 text-gray-600">{page.summary}</p>

        <div className="mt-12 space-y-12">
          {page.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-2xl font-bold">{section.heading}</h2>
              <div className="mt-4 space-y-4 text-base leading-8 text-gray-700">
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
              {section.items.length > 0 && (
                <ul className="mt-5 space-y-3">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-3 leading-7 text-gray-700">
                      <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-purple-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <section className="mt-14 border-t border-purple-100 pt-8">
          <h2 className="text-xl font-bold">{publisher.contactTitle}</h2>
          <p className="mt-3 leading-7 text-gray-700">{publisher.contactText}</p>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-4 inline-flex items-center gap-2 font-bold text-purple-700 hover:text-purple-900">
            <Mail className="h-4 w-4" />
            {SUPPORT_EMAIL}
          </a>
        </section>
      </article>
    </main>
  );
}
