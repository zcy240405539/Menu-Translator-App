import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Suspense } from "react";
import AdSenseGate from "@/components/AdSenseGate";
import SiteFooter from "@/components/SiteFooter";
import { getText } from "@/lib/i18n";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

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
  other: {
    "google-adsense-account": process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "ca-pub-8286400764174465",
  },
};

const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "ca-pub-8286400764174465";
const adsenseEnabled = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true";
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
      className={`${geistSans.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData).replace(/</g, "\\u003c") }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <Suspense fallback={null}>
          <AdSenseGate enabled={adsenseEnabled} client={adsenseClient} />
        </Suspense>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
