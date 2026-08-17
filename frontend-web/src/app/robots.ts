import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/*?*menu_hash="],
    },
    sitemap: "https://aimenu.us.kg/sitemap.xml",
  };
}
