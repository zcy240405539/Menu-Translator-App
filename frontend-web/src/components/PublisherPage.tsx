import { Mail } from "lucide-react";
import ContentPageHeader from "@/components/ContentPageHeader";
import {
  DEFAULT_LANGUAGE,
  getText,
  htmlLanguage,
  type Catalog,
  type WebLanguageCode,
} from "@/lib/i18n";
import { PUBLISHER_PAGES, type PublisherPageKey } from "@/lib/publisherPages";
import { absoluteLocalizedUrl } from "@/lib/seo";

const SUPPORT_EMAIL = "support@aimenu.us.kg";

export default function PublisherPage({
  pageKey,
  lang = DEFAULT_LANGUAGE,
  text = getText(DEFAULT_LANGUAGE),
}: {
  pageKey: PublisherPageKey;
  lang?: WebLanguageCode;
  text?: Catalog;
}) {
  const publisher = text.publisher;
  const page = publisher.pages[pageKey];
  const pageRoute = PUBLISHER_PAGES.find(({ key }) => key === pageKey)?.href || "/";
  const canonicalUrl = absoluteLocalizedUrl(pageRoute, lang);
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: page.title,
        description: page.summary,
        inLanguage: lang,
        url: canonicalUrl,
        isPartOf: { "@type": "WebSite", name: text.common.brand, url: "https://aimenu.us.kg/" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: text.common.brand, item: "https://aimenu.us.kg/" },
          { "@type": "ListItem", position: 2, name: page.title, item: canonicalUrl },
        ],
      },
    ],
  };

  return (
    <main lang={htmlLanguage(lang)} dir={lang === "ar" ? "rtl" : "ltr"} className="min-h-screen bg-[#fbf8f4] text-gray-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <ContentPageHeader lang={lang} text={text} currentPage={pageKey} />

      <div className="mx-auto max-w-3xl px-5 py-12 md:py-16">
        <p className="text-sm font-bold uppercase text-purple-700">{publisher.resourceLabel}</p>
        <h1 className="mt-3 text-4xl font-extrabold leading-tight md:text-5xl">{page.title}</h1>
        <p className="mt-6 text-xl leading-8 text-gray-600">{page.summary}</p>

        <div className="mt-12 space-y-12">
          {page.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-2xl font-bold">{section.heading}</h2>
              <div className="mt-4 space-y-4 text-base leading-8 text-gray-700">
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
              {section.items.length > 0 && (
                <ul className="mt-5 space-y-3">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-3 leading-7 text-gray-700">
                      <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-purple-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <section className="mt-14 border-t border-purple-100 pt-8">
          <h2 className="text-xl font-bold">{publisher.contactTitle}</h2>
          <p className="mt-3 leading-7 text-gray-700">{publisher.contactText}</p>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-4 inline-flex items-center gap-2 font-bold text-purple-700 hover:text-purple-900">
            <Mail className="h-4 w-4" />
            {SUPPORT_EMAIL}
          </a>
        </section>
      </div>
    </main>
  );
}
