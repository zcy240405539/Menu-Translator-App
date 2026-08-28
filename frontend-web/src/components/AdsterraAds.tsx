"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { shouldLoadAdsterra } from "@/lib/adsterra";

export type AdsterraPlacement = {
  key: string;
  scriptUrl: string;
  width: number;
  height: number;
};

type AdsterraAdsProps = {
  enabled: boolean;
  desktop: AdsterraPlacement;
  mobile: AdsterraPlacement;
};

function isReady(placement: AdsterraPlacement) {
  return Boolean(placement.key && placement.scriptUrl && placement.width > 0 && placement.height > 0);
}

function frameHtml(placement: AdsterraPlacement) {
  const options = JSON.stringify({
    key: placement.key,
    format: "iframe",
    height: placement.height,
    width: placement.width,
    params: {},
  }).replace(/</g, "\\u003c");
  const scriptUrl = JSON.stringify(placement.scriptUrl).replace(/</g, "\\u003c");

  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;overflow:hidden;background:transparent}</style></head><body><script>window.atOptions=${options};</script><script src=${scriptUrl}></script></body></html>`;
}

export default function AdsterraAds({ enabled, desktop, mobile }: AdsterraAdsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const syncViewport = () => setIsMobile(media.matches);
    syncViewport();
    media.addEventListener("change", syncViewport);
    return () => media.removeEventListener("change", syncViewport);
  }, []);

  const placement = isMobile === true ? mobile : isMobile === false ? desktop : null;
  const mayLoadAds = shouldLoadAdsterra(
    pathname,
    searchParams,
    enabled,
    Boolean(placement && isReady(placement)),
  );
  const html = useMemo(() => (placement ? frameHtml(placement) : ""), [placement]);

  if (!placement || !mayLoadAds) return null;

  return (
    <aside aria-label="Advertisement" className="mx-auto flex w-full justify-center overflow-hidden px-0 py-5 sm:px-4">
      <iframe
        key={`${placement.key}-${placement.width}x${placement.height}`}
        title="Advertisement"
        width={placement.width}
        height={placement.height}
        loading="lazy"
        scrolling="no"
        sandbox="allow-popups allow-popups-to-escape-sandbox allow-scripts allow-top-navigation-by-user-activation"
        referrerPolicy="strict-origin-when-cross-origin"
        srcDoc={html}
        className="block max-w-full border-0"
      />
    </aside>
  );
}
