import type { MetadataRoute } from "next";
import { PUBLISHER_PAGES } from "@/lib/publisherPages";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://aimenu.us.kg";
  const paths = ["/", "/download/", ...PUBLISHER_PAGES.map(({ href }) => `${href}/`), "/privacy-policy/", "/terms-of-service/"];
  return paths.map((path, index) => ({
    url: `${baseUrl}${path}`,
    changeFrequency: index === 0 ? "weekly" : "monthly",
    priority: index === 0 ? 1 : 0.7,
  }));
}
