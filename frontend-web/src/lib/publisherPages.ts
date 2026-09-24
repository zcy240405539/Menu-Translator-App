import type { Metadata } from "next";
import {
  DEFAULT_LANGUAGE,
  getText,
  type Catalog,
  type WebLanguageCode,
} from "@/lib/i18n";
import {
  absoluteLocalizedUrl,
  localizedAlternates,
} from "@/lib/seo";

export const PUBLISHER_PAGES = [
  { key: "howItWorks", href: "/how-it-works" },
  { key: "guide", href: "/menu-translation-guide" },
  { key: "examples", href: "/menu-examples" },
  { key: "languages", href: "/supported-languages" },
  { key: "about", href: "/about" },
  { key: "contact", href: "/contact" },
] as const;

export type PublisherPageKey = (typeof PUBLISHER_PAGES)[number]["key"];

export function publisherPageMetadata(
  key: PublisherPageKey,
  language: WebLanguageCode = DEFAULT_LANGUAGE,
  text: Catalog = getText(DEFAULT_LANGUAGE),
): Metadata {
  const page = text.publisher.pages[key];
  const route = PUBLISHER_PAGES.find((item) => item.key === key);
  const canonical = route?.href || "/";
  const canonicalUrl = absoluteLocalizedUrl(canonical, language);
  return {
    title: `${page.title} | ${text.common.brand}`,
    description: page.summary,
    alternates: {
      canonical: canonicalUrl,
      languages: localizedAlternates(canonical),
    },
    openGraph: {
      type: "website",
      url: canonicalUrl,
      siteName: text.common.brand,
      title: page.title,
      description: page.summary,
      locale: language,
    },
    robots: { index: true, follow: true },
  };
}
