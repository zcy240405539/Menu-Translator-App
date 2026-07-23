"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Utensils, Smartphone, CheckCircle, ArrowLeft, Share2, History, ShoppingCart, User } from "lucide-react";
import Link from "next/link";
import MenuAnalyzer from "@/components/MenuAnalyzer";

type MenuItem = {
  original_name?: string | null;
  translated_name?: string | null;
  name?: string | null;
  price?: string | number | null;
  category?: string | null;
  category_display_name?: string | null;
  section_heading_original?: string | null;
  section_heading_translated?: string | null;
  description?: string | null;
  description_original?: string | null;
};

type NestedSection = {
  category_name?: string | null;
  section_heading_original?: string | null;
  section_heading_translated?: string | null;
  items?: MenuItem[];
};

type DisplaySection = {
  title: string;
  originalTitle?: string;
  items: MenuItem[];
};

type MenuData = {
  business_name?: string | null;
  restaurant_type?: string | null;
  currency?: string | null;
  menu_items?: MenuItem[];
  sections?: NestedSection[];
};

function apiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");
}

async function fetchCachedMenu(menuHash: string, lang: string): Promise<MenuData | null> {
  if (!menuHash) return null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const res = await fetch(`${apiBaseUrl()}/menus/cache/${menuHash}?target_lang=${encodeURIComponent(lang)}`);
      if (res.ok) return (await res.json()) as MenuData;
    } catch (error) {
      console.error("Error fetching menu data:", error);
    }
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  return null;
}

function sectionTitle(item: MenuItem) {
  return (
    item.category_display_name ||
    item.section_heading_translated ||
    item.section_heading_original ||
    item.category ||
    "Other"
  );
}

function displaySections(menuData: MenuData | null): DisplaySection[] {
  if (!menuData) return [];
  if (menuData.sections?.length) {
    return menuData.sections
      .map((section) => ({
        title: section.category_name || section.section_heading_translated || section.section_heading_original || "Other",
        originalTitle: section.section_heading_original || undefined,
        items: section.items || [],
      }))
      .filter((section) => section.items.length > 0);
  }

  const grouped = new Map<string, MenuItem[]>();
  for (const item of menuData.menu_items || []) {
    const title = sectionTitle(item);
    grouped.set(title, [...(grouped.get(title) || []), item]);
  }
  return Array.from(grouped, ([title, items]) => ({ title, items }));
}

function dishName(item: MenuItem) {
  return item.translated_name || item.name || item.original_name || "Unnamed dish";
}

function dishDescription(item: MenuItem) {
  return item.description || item.description_original || "";
}

function dishPrice(item: MenuItem, currency?: string | null) {
  if (item.price === null || item.price === undefined || item.price === "") return "";
  const value = String(item.price).trim();
  if (!currency || /[$€£¥￥]/.test(value) || value.includes(currency)) return value;
  return `${value} ${currency}`;
}

export default function Home() {
  const [menuHash, setMenuHash] = useState("");
  const [lang, setLang] = useState("zh-cn");
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [menuError, setMenuError] = useState("");

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const params = new URLSearchParams(window.location.search);
      const hash = params.get("menu_hash") || "";
      const nextLang = params.get("lang") || "zh-cn";
      setMenuHash(hash);
      setLang(nextLang);

      if (!hash) {
        setMenuData(null);
        setMenuError("");
        return;
      }

      setIsLoadingMenu(true);
      setMenuError("");
      fetchCachedMenu(hash, nextLang)
        .then((data) => {
          if (cancelled) return;
          setMenuData(data);
          if (!data) setMenuError("Menu result is not available yet. Please refresh in a moment.");
        })
        .finally(() => {
          if (!cancelled) setIsLoadingMenu(false);
        });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const sections = useMemo(() => displaySections(menuData), [menuData]);
  const itemCount = sections.reduce((total, section) => total + section.items.length, 0);
  const showResultView = Boolean(menuHash);

  return (
    <div className="flex min-h-screen flex-col bg-[#fbf8f4] font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-purple-100/70 bg-white/90 shadow-sm backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex flex-1 items-center justify-center gap-2 md:justify-start">
            <span className="text-xl font-bold text-[#5f259f]">AnyMenu</span>
          </Link>
          <div className="hidden items-center space-x-6 text-gray-700 md:flex">
            <Link href="/" className="transition-colors hover:text-purple-600" aria-label="Share">
              <Share2 className="h-5 w-5" />
            </Link>
            <Link href="/" className="transition-colors hover:text-purple-600" aria-label="History">
              <History className="h-5 w-5" />
            </Link>
            <Link href="/" className="transition-colors hover:text-purple-600" aria-label="Cart">
              <ShoppingCart className="h-5 w-5" />
            </Link>
            <Link href="/" className="transition-colors hover:text-purple-600" aria-label="Account">
              <User className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {showResultView ? (
          <section className="min-h-screen w-full bg-[#fbf8f4] py-10">
            <div className="container mx-auto max-w-5xl px-4">
              <Link href="/" className="mb-6 inline-flex items-center gap-2 font-medium text-purple-700 hover:text-purple-800">
                <ArrowLeft className="h-4 w-4" /> Back to Home
              </Link>
              <Card className="border-purple-100 bg-white shadow-lg">
                <CardHeader className="border-b bg-purple-50/60">
                  <CardTitle className="flex flex-col gap-2 text-2xl text-purple-950 sm:flex-row sm:items-center sm:justify-between">
                    <span>{menuData?.business_name || "Restaurant Menu"}</span>
                    <span className="w-fit rounded-full bg-purple-200/60 px-3 py-1 text-sm font-normal text-purple-800">
                      {isLoadingMenu ? "Loading" : `${itemCount} dishes`} · {lang.toUpperCase()}
                    </span>
                  </CardTitle>
                  {menuData?.restaurant_type && <p className="text-purple-700">{menuData.restaurant_type}</p>}
                </CardHeader>
                <CardContent className="p-6">
                  {isLoadingMenu ? (
                    <p className="py-12 text-center text-gray-500">Loading menu result...</p>
                  ) : sections.length > 0 ? (
                    <div className="space-y-8">
                      {sections.map((section) => (
                        <div key={section.title} className="space-y-4">
                          <div>
                            <h3 className="border-b pb-2 text-xl font-bold text-gray-900">{section.title}</h3>
                            {section.originalTitle && section.originalTitle !== section.title && (
                              <p className="pt-1 text-sm text-gray-500">{section.originalTitle}</p>
                            )}
                          </div>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {section.items.map((item, index) => {
                              const name = dishName(item);
                              const originalName = item.original_name && item.original_name !== name ? item.original_name : "";
                              const price = dishPrice(item, menuData?.currency);
                              return (
                                <Card key={`${section.title}-${name}-${index}`} className="border border-gray-100 shadow-sm transition-shadow hover:shadow-md">
                                  <CardContent className="flex h-full flex-col justify-between p-4">
                                    <div>
                                      <h4 className="text-lg font-bold text-gray-950">{name}</h4>
                                      {originalName && <p className="mb-2 text-sm text-gray-500">{originalName}</p>}
                                      {dishDescription(item) && (
                                        <p className="mb-3 text-sm leading-6 text-gray-700">{dishDescription(item)}</p>
                                      )}
                                    </div>
                                    {price && <div className="mt-auto font-semibold text-purple-700">{price}</div>}
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-12 text-center text-gray-500">{menuError || "No menu items found."}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
        ) : (
          <section className="w-full py-16 md:py-24">
            <div className="container mx-auto max-w-6xl px-4 lg:px-8">
              <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-8">
                <div className="space-y-10">
                  <div className="space-y-6">
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-purple-700">Start translating</p>
                    <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-[#5f259f] md:text-5xl lg:text-[3.5rem]">
                      Translate menus,
                      <br />
                      order with ease
                    </h1>
                    <p className="max-w-lg text-lg leading-relaxed text-gray-600 md:text-xl">
                      Upload photos, PDFs, websites, or delivery app links to get clear dish names, descriptions, and ingredients.
                    </p>
                  </div>

                  <div className="grid max-w-md grid-cols-2 gap-4">
                    {["Photos/PDF/Web", "AI Translation", "Order Ready", "Smart Suggestions"].map((label, index) => (
                      <div key={label} className="flex items-center gap-3 rounded-xl border border-purple-100 bg-white px-4 py-3 shadow-sm">
                        <span className="font-bold text-purple-700">{String(index + 1).padStart(2, "0")}</span>
                        <span className="text-sm font-medium text-gray-800">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mx-auto w-full max-w-md lg:ml-auto">
                  <MenuAnalyzer />
                </div>
              </div>
            </div>
          </section>
        )}

        {!showResultView && (
          <section id="features" className="w-full border-t border-purple-100 bg-white py-20">
            <div className="container mx-auto max-w-6xl px-4">
              <div className="mb-12 text-center">
                <h2 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Key Features</h2>
                <p className="mx-auto max-w-[700px] text-lg text-gray-600">
                  Your smart AI menu translator helps you understand local dishes anywhere in the world.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[
                  { icon: Globe, title: "Translate Menus", desc: "Translate supported menus between English, Chinese, and Spanish.", color: "text-blue-600", bg: "bg-blue-100" },
                  { icon: Utensils, title: "Detailed Descriptions", desc: "Get clear explanations of unfamiliar dishes and ingredients.", color: "text-purple-600", bg: "bg-purple-100" },
                  { icon: CheckCircle, title: "Order with Ease", desc: "Build a clear list of chosen dishes to show the waiter.", color: "text-amber-600", bg: "bg-amber-100" },
                  { icon: Smartphone, title: "All Menu Types", desc: "Photos, PDFs, and menu links route to the same backend parser.", color: "text-pink-600", bg: "bg-pink-100" },
                ].map((feature) => (
                  <Card key={feature.title} className="border-0 bg-gray-50/70 shadow-sm">
                    <CardHeader className="items-center pb-2 text-center">
                      <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full ${feature.bg}`}>
                        <feature.icon className={`h-7 w-7 ${feature.color}`} />
                      </div>
                      <CardTitle className="text-xl font-bold text-gray-900">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <p className="text-sm leading-relaxed text-gray-600">{feature.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="w-full border-t bg-gray-50 py-8 text-gray-500">
        <div className="container mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 md:flex-row">
          <span className="text-lg font-bold text-gray-700">AnyMenu</span>
          <p className="text-sm">© {new Date().getFullYear()} AnyMenu. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy-policy" className="text-sm transition-colors hover:text-purple-600">
              Privacy Policy
            </Link>
            <Link href="/account-deletion" className="text-sm transition-colors hover:text-purple-600">
              Account Deletion
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
