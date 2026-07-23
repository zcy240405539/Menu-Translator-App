"use client";

import { useEffect, useRef } from "react";

type AdSenseWindow = Window & {
  adsbygoogle?: unknown[];
};

type AdSenseSlotProps = {
  className?: string;
  label?: string;
};

export function AdSenseSlot({ className = "", label = "Advertisement" }: AdSenseSlotProps) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "ca-pub-8286400764174465";
  const slot = process.env.NEXT_PUBLIC_ADSENSE_ANALYZE_SLOT;
  const adTest = process.env.NEXT_PUBLIC_ADSENSE_TEST === "true" ? "on" : undefined;
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (!slot || !adRef.current || adRef.current.dataset.adsbygoogleStatus === "done") return;
    try {
      const adWindow = window as AdSenseWindow;
      adWindow.adsbygoogle = adWindow.adsbygoogle || [];
      adWindow.adsbygoogle.push({});
    } catch (error) {
      console.warn("AdSense slot failed to initialize:", error);
    }
  }, [slot]);

  if (!slot) {
    return <div className={`text-center text-xs text-gray-500 ${className}`}>{label}</div>;
  }

  return (
    <div className={className}>
      <p className="mb-2 text-center text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
      <ins
        ref={adRef}
        className="adsbygoogle block min-h-24"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
        data-adtest={adTest}
      />
    </div>
  );
}
