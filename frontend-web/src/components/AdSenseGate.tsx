"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { shouldLoadAdsense } from "@/lib/adsense";

export default function AdSenseGate({ enabled, client }: { enabled: boolean; client: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mayLoadAds = shouldLoadAdsense(pathname, searchParams, enabled, client);

  if (!mayLoadAds) return null;

  return (
    <Script
      id="adsense-script"
      async
      crossOrigin="anonymous"
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
    />
  );
}
