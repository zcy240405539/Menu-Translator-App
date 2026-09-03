import type { Metadata } from "next";
import { getText } from "@/lib/i18n";

export const PUBLISHER_PAGES = [
  { key: "howItWorks", href: "/how-it-works" },
  { key: "guide", href: "/menu-translation-guide" },
  { key: "examples", href: "/menu-examples" },
  { key: "languages", href: "/supported-languages" },
  { key: "about", href: "/about" },
  { key: "contact", href: "/contact" },
] as const;

export type PublisherPageKey = (typeof PUBLISHER_PAGES)[number]["key"];

export function publisherPageMetadata(key: PublisherPageKey): Metadata {
  const text = getText("en");
  const page = text.publisher.pages[key];
  const route = PUBLISHER_PAGES.find((item) => item.key === key);
  const canonical = route?.href || "/";
  return {
    title: `${page.title} | ${text.common.brand}`,
    description: page.summary,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: text.common.brand,
      title: page.title,
      description: page.summary,
    },
    robots: { index: true, follow: true },
  };
}
