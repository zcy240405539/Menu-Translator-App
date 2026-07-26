"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText, Globe2, ShieldCheck, User, UserMinus } from "lucide-react";
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  getInitialLanguage,
  getText,
  languageLabel,
  normalizeLanguage,
  saveLanguage,
  type WebLanguageCode,
} from "@/lib/i18n";

export default function SettingsPage() {
  const [lang, setLang] = useState<WebLanguageCode>(DEFAULT_LANGUAGE);
  const text = getText(lang);
  const query = `?lang=${encodeURIComponent(lang)}`;

  useEffect(() => {
    queueMicrotask(() => {
      const params = new URLSearchParams(window.location.search);
      setLang(normalizeLanguage(params.get("lang") || getInitialLanguage()));
    });
  }, []);

  const changeLanguage = (nextLanguage: string) => {
    const normalized = normalizeLanguage(nextLanguage);
    setLang(normalized);
    saveLanguage(normalized);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", normalized);
    window.history.replaceState({}, "", url.toString());
  };

  const links = [
    { href: `/privacy-policy${query}`, label: text.settings.privacy, icon: ShieldCheck },
    { href: `/terms-of-service${query}`, label: text.settings.terms, icon: FileText },
    { href: `/account-deletion${query}`, label: text.settings.deletion, icon: UserMinus },
  ];

  return (
    <main className="min-h-screen bg-[#fbf8f4] px-4 py-8 text-gray-950">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10 flex items-center justify-between gap-4">
          <Link href={`/${query}`} className="flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-purple-600">
            <Image src="/ai-menu-logo.png" alt="" width={40} height={40} className="rounded-md" priority />
            <span className="text-xl font-extrabold text-[#5f259f]">AI Menu APP</span>
          </Link>
          <Link href={`/${query}`} className="text-sm font-semibold text-purple-700 hover:text-purple-900">
            {text.settings.backHome}
          </Link>
        </header>

        <h1 className="text-4xl font-extrabold tracking-normal">{text.settings.title}</h1>
        <p className="mt-3 text-lg text-gray-600">{text.settings.subtitle}</p>

        <section className="mt-10 border-y border-purple-100 py-7">
          <div className="flex items-start gap-4">
            <Globe2 className="mt-1 h-6 w-6 shrink-0 text-purple-700" />
            <div className="flex-1">
              <label htmlFor="page-language" className="font-bold">{text.settings.language}</label>
              <p className="mt-1 text-sm text-gray-600">{text.settings.languageDescription}</p>
              <select
                id="page-language"
                value={lang}
                onChange={(event) => changeLanguage(event.target.value)}
                className="mt-4 h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-base outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-200"
              >
                {LANGUAGES.map((option) => (
                  <option key={option.code} value={option.code}>
                    {languageLabel(lang, option.code)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="border-b border-purple-100 py-7">
          <h2 className="text-xl font-bold">{text.settings.account}</h2>
          <p className="mt-1 text-sm text-gray-600">{text.settings.accountDescription}</p>
          <Link href={`/login${query}`} className="mt-4 inline-flex items-center gap-2 font-bold text-purple-700 hover:text-purple-900">
            <User className="h-5 w-5" />
            {text.nav.account}
          </Link>
        </section>

        <section className="py-7">
          <h2 className="mb-3 text-xl font-bold">{text.settings.legal}</h2>
          <div className="divide-y divide-purple-100 border-y border-purple-100">
            {links.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="flex min-h-14 items-center gap-3 py-3 font-semibold text-gray-800 hover:text-purple-800">
                <Icon className="h-5 w-5 text-purple-700" />
                {label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
