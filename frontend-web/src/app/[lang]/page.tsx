import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HomePage from "@/components/HomePage";
import { loadText } from "@/lib/i18n";
import {
  absoluteLocalizedUrl,
  languageFromPathSegment,
  localizedAlternates,
  SEO_LOCALIZED_LANGUAGES,
} from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return SEO_LOCALIZED_LANGUAGES.map(({ segment }) => ({ lang: segment }));
}

async function localizedHome(params: Promise<{ lang: string }>) {
  const { lang: segment } = await params;
  const language = languageFromPathSegment(segment);
  if (!language || language === "en") notFound();
  const text = await loadText(language);
  return { language, text };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { language, text } = await localizedHome(params);
  const metadata = text.metadata.home;
  const canonical = absoluteLocalizedUrl("/", language);
  return {
    title: metadata.title,
    description: metadata.description,
    alternates: {
      canonical,
      languages: localizedAlternates("/"),
    },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: text.common.brand,
      title: metadata.title,
      description: metadata.description,
      locale: language,
    },
    robots: { index: true, follow: true },
  };
}

export default async function LocalizedHomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { language, text } = await localizedHome(params);
  return <HomePage initialLanguage={language} initialText={text} />;
}
