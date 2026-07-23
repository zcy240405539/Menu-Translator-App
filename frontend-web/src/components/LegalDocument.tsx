"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { DEFAULT_LANGUAGE, LANGUAGES, getInitialLanguage, getText, languageLabel, normalizeLanguage, saveLanguage, type WebLanguageCode } from "@/lib/i18n";

const SUPPORT_EMAIL = "support@agentscottystudio.com";
const ACCOUNT_DELETION_MAILTO =
  `mailto:${SUPPORT_EMAIL}?subject=AI%20Menu%20APP%20Account%20Deletion%20Request` +
  "&body=Please%20delete%20my%20AI%20Menu%20APP%20account.%0A%0ARegistered%20email%3A%20%0AUsername%20if%20known%3A%20%0A";

type LegalDocumentProps = {
  kind: "privacy" | "account-deletion";
};

export function LegalDocument({ kind }: LegalDocumentProps) {
  const [lang, setLang] = useState<WebLanguageCode>(DEFAULT_LANGUAGE);
  const isDeletion = kind === "account-deletion";
  const text = getText(lang);
  const legal = text.legal;
  const documentText = isDeletion ? legal.deletion : legal.privacy;

  useEffect(() => {
    queueMicrotask(() => {
      const params = new URLSearchParams(window.location.search);
      setLang(normalizeLanguage(params.get("lang") || getInitialLanguage()));
    });
  }, []);

  const handleLanguageChange = (nextLang: string) => {
    const normalizedLang = normalizeLanguage(nextLang);
    setLang(normalizedLang);
    saveLanguage(normalizedLang);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", normalizedLang);
    window.history.replaceState({}, "", url.toString());
  };

  return (
    <main className="min-h-screen bg-[#fbf8f4] px-4 py-10">
      <article className="mx-auto max-w-4xl rounded-3xl border border-purple-100 bg-white p-6 shadow-sm md:p-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href={`/?lang=${encodeURIComponent(lang)}`} className="inline-flex text-sm font-semibold text-purple-700 hover:text-purple-800">
            {legal.back}
          </Link>
          <label className="relative flex h-9 w-9 cursor-pointer items-center justify-center text-gray-700 transition-colors hover:text-purple-600" aria-label={text.nav.language}>
            <Globe className="h-5 w-5" />
            <select
              aria-label={text.nav.language}
              className="absolute inset-0 cursor-pointer opacity-0"
              value={lang}
              onChange={(event) => handleLanguageChange(event.target.value)}
            >
              {LANGUAGES.map((option) => (
                <option key={option.code} value={option.code}>
                  {languageLabel(lang, option.code)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-purple-700">{legal.brand}</p>
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-950">{documentText.title}</h1>
        <p className="mt-3 text-lg text-gray-600">{documentText.subtitle}</p>

        {isDeletion ? (
          <a
            href={ACCOUNT_DELETION_MAILTO}
            className="mt-8 inline-flex rounded-full bg-purple-700 px-5 py-3 font-bold text-white transition-colors hover:bg-purple-800"
          >
            {legal.deletion.emailButton}
          </a>
        ) : (
          <p className="mt-8 text-base leading-7 text-gray-700">
            {legal.privacy.intro}
          </p>
        )}

        <div className="mt-8 space-y-8">
          {documentText.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-2xl font-bold text-gray-950">{section.heading}</h2>
              <ul className="mt-4 space-y-3">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-3 text-base leading-7 text-gray-700">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-purple-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="mt-10 text-base text-gray-600">
          {legal.contact}:{" "}
          <a className="font-semibold text-purple-700 hover:text-purple-800" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
        </p>
      </article>
    </main>
  );
}
