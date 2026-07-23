"use client";

import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { Loader2, ShoppingCart, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AdSenseSlot } from "@/components/ads/AdSenseSlot";
import { getText, type WebLanguageCode } from "@/lib/i18n";

export type ResultMenuItem = {
  id?: string | number | null;
  original_name?: string | null;
  translated_name?: string | null;
  name?: string | null;
  price?: string | number | null;
  description?: string | null;
  description_original?: string | null;
  source_language?: string | null;
  currency?: string | null;
  cuisine?: string | null;
  image_prompt?: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  section_heading_original?: string | null;
  category?: string | null;
  ingredients?: unknown;
  allergens?: unknown;
  spicy_level?: string | number | null;
};

type ResultMenuData = {
  business_name?: string | null;
  restaurant_type?: string | null;
  source_language?: string | null;
  currency?: string | null;
};

type WebText = ReturnType<typeof getText>;

const DIETS = ["Vegetarian", "Halal", "Kosher", "Keto", "Gluten-Free"] as const;
type Diet = (typeof DIETS)[number];

function apiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");
}

function dishTitle(item?: ResultMenuItem | null, fallback = "Dish") {
  return item?.translated_name || item?.name || item?.original_name || fallback;
}

function dishDescription(item?: ResultMenuItem | null) {
  return item?.description || item?.description_original || "";
}

function normalizeList(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (typeof value === "string") return value.split(/[,，]/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function priceText(item: ResultMenuItem, currency?: string | null) {
  if (item.price === null || item.price === undefined || item.price === "") return "";
  const value = String(item.price).trim();
  if (!currency || /[$€£¥￥]/.test(value) || value.includes(currency)) return value;
  return `${value} ${currency}`;
}

function authToken() {
  return window.localStorage.getItem("menu_app_token") || window.sessionStorage.getItem("menu_app_token");
}

async function addToCart(item: ResultMenuItem, menuData: ResultMenuData | null) {
  const token = authToken();
  if (!token) return false;

  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const current = await fetch(`${apiBaseUrl()}/user/cart`, { headers }).then((res) => res.ok ? res.json() : { items: [] });
  const newItem = {
    cartId: `${Date.now()}-${item.id || dishTitle(item)}`,
    addedAt: new Date().toISOString(),
    quantity: 1,
    dish: item,
    menuInfo: {
      business_name: menuData?.business_name,
      restaurant_type: menuData?.restaurant_type,
      source_language: menuData?.source_language,
      currency: menuData?.currency,
    },
  };
  await fetch(`${apiBaseUrl()}/user/cart`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ items: [newItem, ...((current.items || []) as unknown[])] }),
  });
  return true;
}

export function DishDetailDialog({
  item,
  menuData,
  lang,
  text,
  onClose,
}: {
  item: ResultMenuItem | null;
  menuData: ResultMenuData | null;
  lang: WebLanguageCode;
  text: WebText;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<ResultMenuItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      if (!item) {
        setDetail(null);
        setAdded(false);
        return;
      }

      setLoading(true);
      setAdded(false);
      const baseName = item.original_name || item.translated_name || item.name || "";
      fetch(`${apiBaseUrl()}/dish/detail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dish_name: baseName,
          target_lang: lang,
          source_lang: item.source_language || menuData?.source_language || "auto",
          original_name: item.original_name,
          translated_name: item.translated_name || item.name,
          description: item.description || item.description_original,
          ingredients: item.ingredients,
          cuisine: item.cuisine,
          image_prompt: item.image_prompt,
          section_heading_original: item.section_heading_original || item.category,
        }),
      })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (!cancelled) setDetail(data || null);
        })
        .catch((error) => console.warn("Dish detail failed:", error))
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [item, lang, menuData?.source_language]);

  if (!item) return null;

  const merged = { ...item, ...(detail || {}) };
  const title = dishTitle(merged, text.result.unnamedDish);
  const original = merged.original_name && merged.original_name !== title ? merged.original_name : "";
  const description = dishDescription(merged);
  const imageUrl = merged.image_url || merged.thumbnail_url;
  const ingredients = normalizeList(merged.ingredients);
  const allergens = normalizeList(merged.allergens);
  const price = priceText(merged, merged.currency || menuData?.currency);

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/40 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true">
      <Card className="mx-auto max-w-3xl overflow-hidden border-purple-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-xl font-extrabold text-gray-950">{title}</h2>
            {original && <p className="text-sm text-gray-500">{original}</p>}
          </div>
          <button type="button" className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900" onClick={onClose} aria-label={text.result.close}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <CardContent className="grid gap-6 p-5 md:grid-cols-[280px_1fr]">
          <div className="overflow-hidden rounded-xl bg-purple-50">
            {imageUrl ? (
              <img src={String(imageUrl)} alt="" className="h-72 w-full object-cover md:h-full" />
            ) : (
              <div className="flex h-72 items-center justify-center text-sm font-semibold text-purple-700">
                {loading ? text.result.detailLoading : text.result.imagePending}
              </div>
            )}
          </div>
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              {price && <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-bold text-purple-800">{price}</span>}
              {loading && (
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-purple-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {text.result.detailLoading}
                </span>
              )}
            </div>

            <InfoBlock title={text.result.description} value={description || text.result.unknown} />
            <ChipBlock title={text.result.ingredients} values={ingredients} empty={text.result.unknown} />
            <ChipBlock title={text.result.allergens} values={allergens} empty={text.result.none} warning />
            <InfoBlock title={text.result.spicyLevel} value={`${merged.spicy_level ?? 0} / 5`} />

            <Button
              type="button"
              className="h-11 rounded-xl bg-purple-700 px-5 text-white hover:bg-purple-800"
              onClick={async () => {
                setAdded(await addToCart(merged, menuData));
              }}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              {added ? text.result.addedToCart : text.result.addToCart}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoBlock({ title, value }: { title: string; value: string }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-bold text-gray-950">{title}</h3>
      <p className="leading-6 text-gray-700">{value}</p>
    </section>
  );
}

function ChipBlock({ title, values, empty, warning = false }: { title: string; values: string[]; empty: string; warning?: boolean }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-bold text-gray-950">{title}</h3>
      {values.length ? (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <span key={value} className={`rounded-full px-3 py-1 text-sm font-medium ${warning ? "bg-red-50 text-red-700" : "bg-purple-50 text-purple-800"}`}>
              {value}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-gray-600">{empty}</p>
      )}
    </section>
  );
}

export function RecommendationDialog({
  open,
  items,
  menuData,
  lang,
  text,
  onClose,
  onSelectDish,
}: {
  open: boolean;
  items: ResultMenuItem[];
  menuData: ResultMenuData | null;
  lang: WebLanguageCode;
  text: WebText;
  onClose: () => void;
  onSelectDish: (item: ResultMenuItem) => void;
}) {
  const [people, setPeople] = useState("");
  const [selectedDiets, setSelectedDiets] = useState<Diet[]>([]);
  const [budget, setBudget] = useState("");
  const [allergies, setAllergies] = useState("");
  const [taste, setTaste] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAd, setShowAd] = useState(false);
  const [recommendation, setRecommendation] = useState("");
  const [recommendedItems, setRecommendedItems] = useState<{ id?: string | number; reason?: string }[]>([]);

  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        setError("");
        setShowAd(false);
        setRecommendation("");
        setRecommendedItems([]);
      });
    }
  }, [open]);

  const itemById = useMemo(() => new Map(items.map((item) => [String(item.id), item])), [items]);
  const matchedItems = recommendedItems
    .map((item) => {
      const dish = itemById.get(String(item.id));
      return dish ? { dish, reason: item.reason || "" } : null;
    })
    .filter(Boolean) as { dish: ResultMenuItem; reason: string }[];

  if (!open) return null;

  const toggleDiet = (diet: Diet) => {
    setSelectedDiets((current) => current.includes(diet) ? current.filter((item) => item !== diet) : [...current, diet]);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setShowAd(true);
    try {
      const allergyList = allergies.split(/[,，]/).map((item) => item.trim()).filter(Boolean);
      const res = await fetch(`${apiBaseUrl()}/menus/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menu_items: items,
          people: people ? Number.parseInt(people, 10) : null,
          diets: selectedDiets.length ? selectedDiets : null,
          allergies: allergyList.length ? allergyList : null,
          budget: budget || null,
          taste: taste || null,
          target_lang: lang,
        }),
      });
      if (!res.ok) throw new Error(text.result.recommendationError);
      const data = (await res.json()) as { recommendation?: string; items?: { id?: string | number; reason?: string }[] };
      setRecommendation(data.recommendation || "");
      setRecommendedItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : text.result.recommendationError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/40 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true">
      <Card className="mx-auto max-w-4xl border-purple-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-700" />
            <h2 className="text-xl font-extrabold text-gray-950">{text.result.recommendationTitle}</h2>
          </div>
          <button type="button" className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900" onClick={onClose} aria-label={text.result.close}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <CardContent className="space-y-6 p-5">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
            <Field label={text.result.peopleLabel}>
              <Input value={people} onChange={(event) => setPeople(event.target.value)} placeholder={text.result.peoplePlaceholder} type="number" min="1" />
            </Field>
            <Field label={text.result.budgetLabel}>
              <Input value={budget} onChange={(event) => setBudget(event.target.value)} placeholder={text.result.budgetPlaceholder} />
            </Field>
            <Field label={text.result.allergiesLabel}>
              <Input value={allergies} onChange={(event) => setAllergies(event.target.value)} placeholder={text.result.allergiesPlaceholder} />
            </Field>
            <Field label={text.result.tasteLabel}>
              <Input value={taste} onChange={(event) => setTaste(event.target.value)} placeholder={text.result.tastePlaceholder} />
            </Field>
            <div className="space-y-2 md:col-span-2">
              <p className="text-sm font-bold text-gray-800">{text.result.dietLabel}</p>
              <div className="flex flex-wrap gap-2">
                {DIETS.map((diet) => {
                  const selected = selectedDiets.includes(diet);
                  return (
                    <button
                      type="button"
                      key={diet}
                      onClick={() => toggleDiet(diet)}
                      className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${selected ? "bg-purple-700 text-white" : "bg-purple-50 text-purple-800 hover:bg-purple-100"}`}
                    >
                      {text.result.dietOptions[diet] || diet}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="md:col-span-2">
              {error && <p className="mb-3 text-sm font-semibold text-red-600">{error}</p>}
              <Button type="submit" disabled={loading || items.length === 0} className="h-11 rounded-xl bg-purple-700 px-5 text-white hover:bg-purple-800">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {loading ? text.result.generatingRecommendation : text.result.generateRecommendation}
              </Button>
              {showAd && (
                <AdSenseSlot
                  className="mt-4 rounded-xl border border-purple-100 bg-purple-50/40 p-3"
                  label={text.analyzer.ad}
                />
              )}
            </div>
          </form>

          {recommendation && (
            <Card className="border-purple-100 bg-purple-50/50">
              <CardContent className="space-y-2 p-4">
                <h3 className="font-bold text-gray-950">{text.result.recommendationSummary}</h3>
                <p className="leading-6 text-gray-700">{recommendation}</p>
              </CardContent>
            </Card>
          )}

          {matchedItems.length > 0 && (
            <section className="space-y-3">
              <h3 className="font-bold text-gray-950">{text.result.recommendedDishes}</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {matchedItems.map(({ dish, reason }) => (
                  <button key={String(dish.id)} type="button" className="text-left" onClick={() => onSelectDish(dish)}>
                    <Card className="h-full border-gray-100 transition-all hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md">
                      <CardContent className="space-y-2 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-bold text-gray-950">{dishTitle(dish, text.result.unnamedDish)}</h4>
                            {dish.original_name && <p className="text-sm text-gray-500">{dish.original_name}</p>}
                          </div>
                          {priceText(dish, dish.currency || menuData?.currency) && (
                            <span className="rounded-full bg-purple-100 px-2.5 py-1 text-sm font-bold text-purple-800">
                              {priceText(dish, dish.currency || menuData?.currency)}
                            </span>
                          )}
                        </div>
                        {reason && <p className="text-sm leading-6 text-gray-700">{reason}</p>}
                      </CardContent>
                    </Card>
                  </button>
                ))}
              </div>
            </section>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-bold text-gray-800">{label}</span>
      {children}
    </label>
  );
}
