"use client";

import { type MouseEvent, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Utensils, Smartphone, CheckCircle, Share2, History, ShoppingCart, User, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import MenuAnalyzer from "@/components/MenuAnalyzer";
import { DishDetailDialog, RecommendationDialog } from "@/components/MenuResultDialogs";
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  getInitialLanguage,
  getText,
  htmlLanguage,
  languageLabel,
  languageShortLabel,
  normalizeLanguage,
  saveLanguage,
  type WebLanguageCode,
} from "@/lib/i18n";

type MenuItem = {
  id?: string | number | null;
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
  source_language?: string | null;
  currency?: string | null;
  cuisine?: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  ingredients?: unknown;
  allergens?: unknown;
  spicy_level?: string | number | null;
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
  source_language?: string | null;
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

function sectionTitle(item: MenuItem, otherLabel: string) {
  return (
    item.category_display_name ||
    item.section_heading_translated ||
    item.section_heading_original ||
    item.category ||
    otherLabel
  );
}

function displaySections(menuData: MenuData | null, otherLabel: string): DisplaySection[] {
  if (!menuData) return [];
  if (menuData.sections?.length) {
    return menuData.sections
      .map((section) => ({
        title: section.category_name || section.section_heading_translated || section.section_heading_original || otherLabel,
        originalTitle: section.section_heading_original || undefined,
        items: section.items || [],
      }))
      .filter((section) => section.items.length > 0);
  }

  const grouped = new Map<string, MenuItem[]>();
  for (const item of menuData.menu_items || []) {
    const title = sectionTitle(item, otherLabel);
    grouped.set(title, [...(grouped.get(title) || []), item]);
  }
  return Array.from(grouped, ([title, items]) => ({ title, items }));
}

function dishName(item: MenuItem, fallback: string) {
  return item.translated_name || item.name || item.original_name || fallback;
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

function actionDish(item: MenuItem, sectionIndex: number, itemIndex: number, sectionTitle: string): MenuItem {
  if (item.id !== null && item.id !== undefined && item.id !== "") return item;
  const name = item.original_name || item.translated_name || item.name || "dish";
  return { ...item, id: `${sectionIndex}-${itemIndex}-${sectionTitle}-${name}` };
}

function hasStoredSession() {
  try {
    return [window.localStorage, window.sessionStorage].some((storage) =>
      Array.from({ length: storage.length }, (_, index) => storage.key(index) || "").some((key) =>
        /auth|session|token/i.test(key) && Boolean(storage.getItem(key))
      )
    );
  } catch {
    return false;
  }
}

export default function Home() {
  const [menuHash, setMenuHash] = useState("");
  const [lang, setLang] = useState<WebLanguageCode>(DEFAULT_LANGUAGE);
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [menuError, setMenuError] = useState("");
  const [hasUserSession, setHasUserSession] = useState(false);
  const [shareHref, setShareHref] = useState("/");
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);
  const [showRecommendation, setShowRecommendation] = useState(false);
  const text = getText(lang);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const oauthToken = hashParams.get("access_token");
      if (oauthToken) {
        window.localStorage.setItem("menu_app_token", oauthToken);
        window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}`);
      }

      const params = new URLSearchParams(window.location.search);
      const hash = params.get("menu_hash") || "";
      const openRecommendation = params.get("show_recommend") === "1";
      const nextLang = normalizeLanguage(params.get("lang") || getInitialLanguage());
      setMenuHash(hash);
      setLang(nextLang);
      setHasUserSession(hasStoredSession());
      setShareHref(window.location.href);
      setShowRecommendation(Boolean(hash && openRecommendation));

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
          if (!data) setMenuError(getText(nextLang).result.notAvailable);
        })
        .finally(() => {
          if (!cancelled) setIsLoadingMenu(false);
        });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleHeaderLanguageChange = (nextLang: string) => {
    const normalizedLang = normalizeLanguage(nextLang);
    setLang(normalizedLang);
    saveLanguage(normalizedLang);

    const url = new URL(window.location.href);
    url.searchParams.set("lang", normalizedLang);
    window.history.replaceState({}, "", url.toString());
    setShareHref(url.toString());

    if (!menuHash) return;

    setIsLoadingMenu(true);
    setMenuError("");
    fetchCachedMenu(menuHash, normalizedLang)
      .then((data) => {
        setMenuData(data);
        if (!data) setMenuError(getText(normalizedLang).result.notAvailable);
      })
      .finally(() => setIsLoadingMenu(false));
  };

  const handleShare = async (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: "AI Menu APP", text: text.nav.shareMessage, url: shareUrl });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        window.location.href = `mailto:?subject=${encodeURIComponent("AI Menu APP")}&body=${encodeURIComponent(shareUrl)}`;
      }
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  const handleHomeClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const url = new URL("/", window.location.origin);
    url.searchParams.set("lang", lang);
    window.history.pushState({}, "", url.toString());
    setMenuHash("");
    setMenuData(null);
    setMenuError("");
    setIsLoadingMenu(false);
    setSelectedDish(null);
    setShowRecommendation(false);
    setShareHref(url.toString());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenRecommendation = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (!menuHash) return;
    const url = new URL(window.location.href);
    url.searchParams.set("show_recommend", "1");
    window.history.pushState({}, "", url.toString());
    setShareHref(url.toString());
    setShowRecommendation(true);
  };

  const handleCloseRecommendation = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("show_recommend");
    window.history.replaceState({}, "", url.toString());
    setShareHref(url.toString());
    setShowRecommendation(false);
  };

  useEffect(() => {
    document.documentElement.lang = htmlLanguage(lang);
    document.title = text.metaTitle;
  }, [lang, text.metaTitle]);

  const sections = useMemo(() => displaySections(menuData, text.result.other), [menuData, text.result.other]);
  const itemCount = sections.reduce((total, section) => total + section.items.length, 0);
  const showResultView = Boolean(menuHash);
  const showSavedMenuLinks = showResultView || hasUserSession;
  const langQuery = `?lang=${encodeURIComponent(lang)}`;
  const historyHref = `/history${langQuery}`;
  const cartHref = `/cart${langQuery}`;
  const homeHref = `/${langQuery}`;
  const recommendHref = `/?menu_hash=${encodeURIComponent(menuHash)}&lang=${encodeURIComponent(lang)}&show_recommend=1`;
  const actionItems = useMemo(
    () => sections.flatMap((section, sectionIndex) =>
      section.items.map((item, itemIndex) => actionDish(item, sectionIndex, itemIndex, section.title))
    ),
    [sections]
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#fbf8f4] font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-purple-100/70 bg-white/90 shadow-sm backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <a href={homeHref} onClick={handleHomeClick} className="group flex flex-1 items-center justify-center gap-2 rounded-md transition-all hover:opacity-90 md:justify-start">
            <Image src="/ai-menu-logo.png" alt="" width={36} height={36} className="rounded-md transition-shadow group-hover:shadow-md" priority />
            <span className="text-xl font-bold text-[#5f259f] transition-colors group-hover:text-purple-700">AI Menu APP</span>
          </a>
          <div className="hidden items-center space-x-6 text-gray-700 md:flex">
            <label className="relative flex h-9 w-9 cursor-pointer items-center justify-center transition-colors hover:text-purple-600" aria-label={text.nav.language}>
              <Globe className="h-5 w-5" />
              <select
                aria-label={text.nav.language}
                className="absolute inset-0 cursor-pointer opacity-0"
                value={lang}
                onChange={(event) => handleHeaderLanguageChange(event.target.value)}
              >
                {LANGUAGES.map((option) => (
                  <option key={option.code} value={option.code}>
                    {languageLabel(lang, option.code)}
                  </option>
                ))}
              </select>
            </label>
            <a href={shareHref} className="transition-colors hover:text-purple-600" aria-label={text.nav.share} onClick={handleShare}>
              <Share2 className="h-5 w-5" />
            </a>
            {showSavedMenuLinks && (
              <>
                <Link href={historyHref} className="transition-colors hover:text-purple-600" aria-label={text.nav.history}>
                  <History className="h-5 w-5" />
                </Link>
                <Link href={cartHref} className="transition-colors hover:text-purple-600" aria-label={text.nav.cart}>
                  <ShoppingCart className="h-5 w-5" />
                </Link>
              </>
            )}
            <Link href={`/login${langQuery}`} className="transition-colors hover:text-purple-600" aria-label={text.nav.account}>
              <User className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {showResultView ? (
          <section className="min-h-screen w-full bg-[#fbf8f4] py-10">
            <div className="container mx-auto max-w-5xl px-4">
              <Card className="border-purple-100 bg-white shadow-lg">
                <CardHeader className="border-b bg-purple-50/60">
                  <CardTitle className="flex flex-col gap-2 text-2xl text-purple-950 sm:flex-row sm:items-center sm:justify-between">
                    <span>{menuData?.business_name || text.result.restaurantMenu}</span>
                    <span className="w-fit rounded-full bg-purple-200/60 px-3 py-1 text-sm font-normal text-purple-800">
                      {isLoadingMenu ? text.result.loading : `${itemCount} ${text.result.dishes}`} · {languageShortLabel(lang, lang)}
                    </span>
                  </CardTitle>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {menuData?.restaurant_type && <p className="text-purple-700">{menuData.restaurant_type}</p>}
                    <a
                      href={recommendHref}
                      onClick={handleOpenRecommendation}
                      className="inline-flex w-fit items-center gap-2 rounded-full bg-purple-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-purple-800"
                    >
                      <Sparkles className="h-4 w-4" />
                      {text.result.recommendLink}
                    </a>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {isLoadingMenu ? (
                    <p className="py-12 text-center text-gray-500">{text.result.loadingResult}</p>
                  ) : sections.length > 0 ? (
                    <div className="space-y-8">
                      {sections.map((section, sectionIndex) => (
                        <div key={section.title} className="space-y-4">
                          <div>
                            <h3 className="border-b pb-2 text-xl font-bold text-gray-900">{section.title}</h3>
                            {section.originalTitle && section.originalTitle !== section.title && (
                              <p className="pt-1 text-sm text-gray-500">{section.originalTitle}</p>
                            )}
                          </div>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {section.items.map((item, index) => {
                              const clickableItem = actionDish(item, sectionIndex, index, section.title);
                              const name = dishName(item, text.result.unnamedDish);
                              const originalName = item.original_name && item.original_name !== name ? item.original_name : "";
                              const price = dishPrice(item, menuData?.currency);
                              return (
                                <button key={`${section.title}-${name}-${index}`} type="button" className="h-full text-left" onClick={() => setSelectedDish(clickableItem)}>
                                  <Card className="h-full border border-gray-100 shadow-sm transition-all hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md">
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
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-12 text-center text-gray-500">{menuError || text.result.noItems}</p>
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
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-purple-700">{text.home.kicker}</p>
                    <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-[#5f259f] md:text-5xl lg:text-[3.5rem]">
                      {text.home.titleLines[0]}
                      <br />
                      {text.home.titleLines[1]}
                    </h1>
                    <p className="max-w-lg text-lg leading-relaxed text-gray-600 md:text-xl">
                      {text.home.subtitle}
                    </p>
                  </div>

                  <div className="grid max-w-md grid-cols-2 gap-4">
                    {text.home.steps.map((label, index) => (
                      <div key={label} className="flex items-center gap-3 rounded-xl border border-purple-100 bg-white px-4 py-3 shadow-sm">
                        <span className="font-bold text-purple-700">{String(index + 1).padStart(2, "0")}</span>
                        <span className="text-sm font-medium text-gray-800">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mx-auto w-full max-w-md lg:ml-auto">
                  <MenuAnalyzer targetLang={lang} onTargetLangChange={handleHeaderLanguageChange} text={text.analyzer} />
                </div>
              </div>
            </div>
          </section>
        )}

        {!showResultView && (
          <section id="features" className="w-full border-t border-purple-100 bg-white py-20">
            <div className="container mx-auto max-w-6xl px-4">
              <div className="mb-12 text-center">
                <h2 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{text.features.title}</h2>
                <p className="mx-auto max-w-[700px] text-lg text-gray-600">
                  {text.features.subtitle}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[
                  { icon: Globe, ...text.features.cards[0], color: "text-blue-600", bg: "bg-blue-100" },
                  { icon: Utensils, ...text.features.cards[1], color: "text-purple-600", bg: "bg-purple-100" },
                  { icon: CheckCircle, ...text.features.cards[2], color: "text-amber-600", bg: "bg-amber-100" },
                  { icon: Smartphone, ...text.features.cards[3], color: "text-pink-600", bg: "bg-pink-100" },
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

      <DishDetailDialog
        item={selectedDish}
        menuData={menuData}
        lang={lang}
        text={text}
        onClose={() => setSelectedDish(null)}
      />
      <RecommendationDialog
        open={showRecommendation}
        items={actionItems}
        menuData={menuData}
        lang={lang}
        text={text}
        onClose={handleCloseRecommendation}
        onSelectDish={(item) => setSelectedDish(item)}
      />

      <footer className="w-full border-t bg-gray-50 py-8 text-gray-500">
        <div className="container mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 md:flex-row">
          <span className="text-lg font-bold text-gray-700">AI Menu APP</span>
          <p className="text-sm">© {new Date().getFullYear()} AI Menu APP. {text.footer.rights}</p>
          <div className="flex gap-6">
            <Link href={`/privacy-policy${langQuery}`} className="text-sm transition-colors hover:text-purple-600">
              {text.footer.privacy}
            </Link>
            <Link href={`/account-deletion${langQuery}`} className="text-sm transition-colors hover:text-purple-600">
              {text.footer.deletion}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
