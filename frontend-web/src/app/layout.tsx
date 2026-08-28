import type { Metadata } from "next";
import AdsterraAds, { type AdsterraPlacement } from "@/components/AdsterraAds";
import SiteFooter from "@/components/SiteFooter";
import { getText } from "@/lib/i18n";
import "./globals.css";

const defaultMetadata = getText("en").metadata.home;

export const metadata: Metadata = {
  metadataBase: new URL("https://aimenu.us.kg"),
  title: defaultMetadata.title,
  description: defaultMetadata.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "AI Menu APP",
    title: defaultMetadata.title,
    description: defaultMetadata.description,
  },
  robots: { index: true, follow: true },
};

function scriptUrl(value: string | undefined) {
  const url = value?.trim() || "";
  if (url.startsWith("//")) return `https:${url}`;
  return url.startsWith("https://") ? url : "";
}

const adsterraEnabled = process.env.NEXT_PUBLIC_ADSTERRA_ENABLED === "true";
const desktopAd: AdsterraPlacement = {
  key: process.env.NEXT_PUBLIC_ADSTERRA_DESKTOP_KEY?.trim() || "",
  scriptUrl: scriptUrl(process.env.NEXT_PUBLIC_ADSTERRA_DESKTOP_SCRIPT_URL),
  width: 728,
  height: 90,
};
const mobileAd: AdsterraPlacement = {
  key: process.env.NEXT_PUBLIC_ADSTERRA_MOBILE_KEY?.trim() || "",
  scriptUrl: scriptUrl(process.env.NEXT_PUBLIC_ADSTERRA_MOBILE_SCRIPT_URL),
  width: 320,
  height: 50,
};
const organizationData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "AI Menu APP",
  url: "https://aimenu.us.kg/",
  email: "support@aimenu.us.kg",
  logo: "https://aimenu.us.kg/ai-menu-logo.png",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData).replace(/</g, "\\u003c") }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        <AdsterraAds enabled={adsterraEnabled} desktop={desktopAd} mobile={mobileAd} />
        <SiteFooter />
      </body>
    </html>
  );
}
