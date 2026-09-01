"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { History, Settings, ShoppingCart, User } from "lucide-react";
import UtilityPageHeader from "@/components/UtilityPageHeader";
import { useText } from "@/hooks/useText";
import {
  DEFAULT_LANGUAGE,
  applyDocumentLanguage,
  getPageLanguage,
  type WebLanguageCode,
} from "@/lib/i18n";

type StoredUser = {
  username?: string;
  email?: string;
};

function storedUser(): StoredUser | null {
  const token = window.localStorage.getItem("menu_app_token") || window.sessionStorage.getItem("menu_app_token");
  const rawUser = window.localStorage.getItem("menu_app_user") || window.sessionStorage.getItem("menu_app_user");
  if (!token || !rawUser) return null;

  try {
    return JSON.parse(rawUser) as StoredUser;
  } catch {
    return null;
  }
}

export default function AccountPage() {
  const [lang, setLang] = useState<WebLanguageCode>(DEFAULT_LANGUAGE);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [ready, setReady] = useState(false);
  const text = useText(lang);
  const query = `?lang=${encodeURIComponent(lang)}`;
  const loginHref = `/login${query}&next=${encodeURIComponent(`/account${query}`)}`;

  useEffect(() => {
    queueMicrotask(() => {
      const nextLang = getPageLanguage();
      setLang(nextLang);
      setUser(storedUser());
      setReady(true);
      applyDocumentLanguage(nextLang);
    });
  }, []);

  useEffect(() => {
    document.title = `${text.nav.account} - ${text.common.brand}`;
  }, [text.common.brand, text.nav.account]);

  const accountLinks = [
    { href: `/history${query}`, label: text.nav.history, icon: History },
    { href: `/cart${query}`, label: text.nav.cart, icon: ShoppingCart },
    { href: `/settings${query}`, label: text.nav.settings, icon: Settings },
  ];

  return (
    <main className="min-h-screen bg-[#fbf8f4] px-4 py-8 text-gray-950">
      <div className="mx-auto max-w-3xl">
        <UtilityPageHeader lang={lang} />

        <h1 className="text-4xl font-extrabold tracking-normal">{text.nav.account}</h1>
        <p className="mt-3 text-lg text-gray-600">{text.settings.accountDescription}</p>

        <section className="mt-10 border-y border-purple-100 py-7">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700">
              <User className="h-6 w-6" />
            </span>

            <div className="min-w-0 flex-1">
              {!ready && <p className="py-2 text-gray-500">{text.saved.loading}</p>}

              {ready && !user && (
                <div>
                  <p className="text-gray-600">{text.saved.signInPrompt}</p>
                  <Link
                    href={loginHref}
                    className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-purple-700 px-5 font-semibold text-white hover:bg-purple-800"
                  >
                    {text.auth.signIn}
                  </Link>
                </div>
              )}

              {ready && user && (
                <dl className="space-y-4">
                  {user.username && (
                    <div>
                      <dt className="text-sm font-semibold text-gray-500">{text.auth.username}</dt>
                      <dd className="mt-1 break-words text-lg font-bold">{user.username}</dd>
                    </div>
                  )}
                  {user.email && (
                    <div>
                      <dt className="text-sm font-semibold text-gray-500">{text.auth.email}</dt>
                      <dd className="mt-1 break-words text-lg font-bold">{user.email}</dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
          </div>
        </section>

        {ready && user && (
          <nav className="divide-y divide-purple-100 border-b border-purple-100" aria-label={text.nav.account}>
            {accountLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="flex min-h-14 items-center gap-3 py-3 font-semibold text-gray-800 hover:text-purple-800">
                <Icon className="h-5 w-5 text-purple-700" />
                {label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </main>
  );
}
