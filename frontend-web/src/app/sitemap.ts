import type { MetadataRoute } from "next";
import { PUBLISHER_PAGES } from "@/lib/publisherPages";
import {
  absoluteLocalizedUrl,
  localizedAlternates,
  SEO_CONTENT_LAST_MODIFIED,
  SEO_LANGUAGES,
  SITE_URL,
} from "@/lib/seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const localizedPaths = ["/", ...PUBLISHER_PAGES.map(({ href }) => href)];
  const localizedPages = localizedPaths.flatMap((path) =>
    SEO_LANGUAGES.map(({ code }) => ({
      url: absoluteLocalizedUrl(path, code),
      lastModified: SEO_CONTENT_LAST_MODIFIED,
      alternates: { languages: localizedAlternates(path) },
    })),
  );
  const legalPages = ["/privacy-policy/", "/terms-of-service/"].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: SEO_CONTENT_LAST_MODIFIED,
  }));
  return [...localizedPages, ...legalPages];
}
