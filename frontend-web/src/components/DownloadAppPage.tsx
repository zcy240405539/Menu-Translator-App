"use client";

import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Globe, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { ANDROID_PLAY_STORE_URL } from "@/lib/appLinks";
import { useText } from "@/hooks/useText";
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  applyDocumentLanguage,
  getPageLanguage,
  loadText,
  languageLabel,
  replacePageLanguage,
  type WebLanguageCode,
} from "@/lib/i18n";

export default function DownloadAppPage() {
  const [lang, setLang] = useState<WebLanguageCode>(DEFAULT_LANGUAGE);
  const text = useText(lang);
  const langQuery = `?lang=${encodeURIComponent(lang)}`;

  useEffect(() => {
    queueMicrotask(async () => {
      const nextLanguage = getPageLanguage();
      setLang(nextLanguage);
      applyDocumentLanguage(nextLanguage);
      const nextText = await loadText(nextLanguage);
      document.title = `${nextText.download.title} | ${nextText.common.brand}`;
    });
  }, []);

  const changeLanguage = (nextLanguage: string) => {
    const normalized = replacePageLanguage(nextLanguage);
    setLang(normalized);
    applyDocumentLanguage(normalized);
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fbf8f4] text-gray-950">
      <header className="border-b border-purple-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <Link href={`/${langQuery}`} className="flex min-w-0 items-center gap-3 rounded-md transition-opacity hover:opacity-85">
            <Image src="/ai-menu-logo.png" alt="" width={38} height={38} className="rounded-md" priority />
            <span className="min-w-0 font-extrabold text-[#5f259f]">{text.common.brand}</span>
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
      </header>

      <section className="flex min-h-[calc(100vh-73px)] items-center border-b border-purple-100 px-5 py-14 sm:py-20">
        <div className="mx-auto flex min-w-0 w-full max-w-3xl flex-col items-center text-center">
          <Image src="/ai-menu-logo.png" alt="" width={88} height={88} className="rounded-lg shadow-sm" priority />
          <p className="mt-7 max-w-full break-words text-sm font-bold uppercase text-purple-700">{text.download.eyebrow}</p>
          <h1 className="mt-4 w-full max-w-full break-words text-4xl font-extrabold leading-tight text-gray-950 sm:text-5xl">{text.download.title}</h1>
          <p className="mt-6 w-full max-w-2xl break-words text-lg leading-8 text-gray-600">{text.download.description}</p>

          <a
            href={ANDROID_PLAY_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-9 inline-flex min-h-12 max-w-full flex-wrap items-center justify-center gap-3 rounded-md bg-[#5f259f] px-6 py-3 text-center font-bold text-white shadow-sm transition-colors hover:bg-purple-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700"
          >
            <Smartphone className="h-5 w-5" />
            <span>{text.download.storeLabel}</span>
            <ExternalLink className="h-4 w-4" />
          </a>
          <p className="mt-4 text-sm text-gray-500">{text.download.availability}</p>

          <Link href={`/${langQuery}`} className="mt-10 font-bold text-purple-700 transition-colors hover:text-purple-900">
            {text.download.backHome}
          </Link>
        </div>
      </section>
    </main>
  );
}
