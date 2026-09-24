import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublisherPage from "@/components/PublisherPage";
import { loadText } from "@/lib/i18n";
import {
  PUBLISHER_PAGES,
  publisherPageMetadata,
  type PublisherPageKey,
} from "@/lib/publisherPages";
import {
  languageFromPathSegment,
  SEO_LOCALIZED_LANGUAGES,
} from "@/lib/seo";

export const dynamicParams = false;

const PAGE_BY_SLUG = new Map(
  PUBLISHER_PAGES.map(({ key, href }) => [href.slice(1), key]),
);

export function generateStaticParams() {
  return SEO_LOCALIZED_LANGUAGES.flatMap(({ segment }) =>
    PUBLISHER_PAGES.map(({ href }) => ({
      lang: segment,
      slug: href.slice(1),
    })),
  );
}

async function localizedPage(params: Promise<{ lang: string; slug: string }>) {
  const { lang: segment, slug } = await params;
  const language = languageFromPathSegment(segment);
  const pageKey = PAGE_BY_SLUG.get(slug) as PublisherPageKey | undefined;
  if (!language || language === "en" || !pageKey) notFound();
  const text = await loadText(language);
  return { language, pageKey, text };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { language, pageKey, text } = await localizedPage(params);
  return publisherPageMetadata(pageKey, language, text);
}

export default async function LocalizedPublisherPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { language, pageKey, text } = await localizedPage(params);
  return <PublisherPage pageKey={pageKey} lang={language} text={text} />;
}
