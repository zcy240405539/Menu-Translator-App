"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, History, ShoppingCart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DEFAULT_LANGUAGE, getInitialLanguage, getText, normalizeLanguage, type WebLanguageCode } from "@/lib/i18n";

type Mode = "history" | "cart";

type HistoryItem = {
  id: number;
  menu_hash?: string | null;
  target_language?: string | null;
  business_name?: string | null;
  restaurant_type?: string | null;
  item_count?: number | null;
  updated_at?: string | null;
};

type CartItem = {
  cartId?: string;
  quantity?: number;
  dish?: {
    name?: string;
    translated_name?: string;
    original_name?: string;
    price?: string | number;
  };
  menuInfo?: {
    business_name?: string;
    restaurant_type?: string;
  };
};

function apiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");
}

function authToken() {
  return window.localStorage.getItem("menu_app_token") || window.sessionStorage.getItem("menu_app_token");
}

function titleForHistory(item: HistoryItem) {
  return item.business_name || item.restaurant_type || "Menu";
}

function titleForCart(item: CartItem) {
  return item.dish?.translated_name || item.dish?.name || item.dish?.original_name || "Dish";
}

export default function SavedPage({ mode }: { mode: Mode }) {
  const [lang, setLang] = useState<WebLanguageCode>(DEFAULT_LANGUAGE);
  const [items, setItems] = useState<(HistoryItem | CartItem)[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState("");
  const text = getText(lang);
  const isHistory = mode === "history";
  const Icon = isHistory ? History : ShoppingCart;
  const title = isHistory ? text.nav.history : text.nav.cart;
  const emptyText = isHistory ? text.saved.emptyHistory : text.saved.emptyCart;
  const langQuery = `?lang=${encodeURIComponent(lang)}`;

  useEffect(() => {
    queueMicrotask(() => {
      const params = new URLSearchParams(window.location.search);
      const nextLang = normalizeLanguage(params.get("lang") || getInitialLanguage());
      const token = authToken();
      const nextText = getText(nextLang);
      const nextTitle = isHistory ? nextText.nav.history : nextText.nav.cart;
      setLang(nextLang);
      document.documentElement.lang = nextLang === "zh-cn" ? "zh-CN" : nextLang;
      document.title = `${nextTitle} - AI Menu APP`;

      if (!token) {
        setNeedsLogin(true);
        setLoading(false);
        return;
      }

      fetch(`${apiBaseUrl()}/user/${isHistory ? "menu-history" : "cart"}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(nextText.saved.loadFailed);
          return (await res.json()) as { items?: (HistoryItem | CartItem)[] };
        })
        .then((data) => setItems(data.items || []))
        .catch((err) => setError(err instanceof Error ? err.message : nextText.saved.loadFailed))
        .finally(() => setLoading(false));
    });
  }, [isHistory]);

  return (
    <main className="min-h-screen bg-[#fbf8f4] px-4 py-10">
      <section className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href={`/${langQuery}`} className="inline-flex items-center gap-2 font-semibold text-purple-700 hover:text-purple-800">
            <ArrowLeft className="h-4 w-4" />
            {text.auth.backHome}
          </Link>
          <Link href={`/${langQuery}`} className="inline-flex items-center gap-2">
            <Image src="/ai-menu-logo.png" alt="" width={34} height={34} className="rounded-md" priority />
            <span className="font-bold text-[#5f259f]">AI Menu APP</span>
          </Link>
        </div>

        <Card className="border-purple-100 bg-white shadow-lg">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                <Icon className="h-5 w-5" />
              </span>
              <h1 className="text-2xl font-extrabold text-gray-950">{title}</h1>
            </div>

            {loading && <p className="py-8 text-center text-gray-500">{text.saved.loading}</p>}
            {!loading && needsLogin && (
              <div className="space-y-4 py-8 text-center">
                <p className="text-gray-600">{text.saved.signInPrompt}</p>
                <Link className="inline-flex h-10 items-center justify-center rounded-xl bg-purple-700 px-4 text-sm font-semibold text-white hover:bg-purple-800" href={`/login${langQuery}&next=/${mode}`}>
                  {text.auth.signIn}
                </Link>
              </div>
            )}
            {!loading && error && <p className="py-8 text-center text-red-500">{error}</p>}
            {!loading && !needsLogin && !error && items.length === 0 && (
              <p className="py-8 text-center text-gray-500">{emptyText}</p>
            )}
            {!loading && !needsLogin && !error && items.length > 0 && (
              <div className="space-y-3">
                {items.map((item, index) =>
                  isHistory ? (
                    <HistoryRow key={(item as HistoryItem).id || index} item={item as HistoryItem} text={text} lang={lang} />
                  ) : (
                    <CartRow key={(item as CartItem).cartId || index} item={item as CartItem} text={text} />
                  )
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function HistoryRow({ item, text, lang }: { item: HistoryItem; text: ReturnType<typeof getText>; lang: WebLanguageCode }) {
  const targetLang = normalizeLanguage(item.target_language || lang);
  const href = item.menu_hash ? `/?lang=${encodeURIComponent(targetLang)}&menu_hash=${encodeURIComponent(item.menu_hash)}` : "";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="font-bold text-gray-950">{titleForHistory(item)}</h2>
        <p className="text-sm text-gray-600">
          {item.item_count || 0} {text.result.dishes}
          {item.updated_at ? ` · ${text.saved.updated} ${new Date(item.updated_at).toLocaleDateString()}` : ""}
        </p>
      </div>
      {href && (
        <Link className="inline-flex h-9 items-center justify-center rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900 hover:bg-gray-50" href={href}>
          {text.saved.openMenu}
        </Link>
      )}
    </div>
  );
}

function CartRow({ item, text }: { item: CartItem; text: ReturnType<typeof getText> }) {
  const price = item.dish?.price === undefined || item.dish.price === null ? "" : String(item.dish.price);

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold text-gray-950">{titleForCart(item)}</h2>
          {item.menuInfo?.business_name && <p className="text-sm text-gray-600">{item.menuInfo.business_name}</p>}
        </div>
        <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-semibold text-purple-800">
          {text.saved.quantity} {item.quantity || 1}
        </span>
      </div>
      {price && <p className="mt-2 font-semibold text-purple-700">{price}</p>}
    </div>
  );
}
