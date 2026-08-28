"use client";

import { useEffect, useRef, useState } from "react";

function scriptUrl(value: string | undefined) {
  const url = value?.trim() || "";
  if (url.startsWith("//")) return `https:${url}`;
  return url.startsWith("https://") ? url : "";
}

export default function InlineAdsterraAd() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const enabled = process.env.NEXT_PUBLIC_ADSTERRA_ENABLED === "true"
    && Boolean(process.env.NEXT_PUBLIC_ADSTERRA_MOBILE_KEY?.trim())
    && Boolean(scriptUrl(process.env.NEXT_PUBLIC_ADSTERRA_MOBILE_SCRIPT_URL));

  useEffect(() => {
    if (!enabled) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type === "adsterra-ready") setReady(true);
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <aside
      aria-label="Advertisement"
      className={`flex justify-center overflow-hidden transition-[max-height,opacity,padding] duration-200 ${ready ? "max-h-20 border-t border-gray-100 py-2 opacity-100" : "max-h-0 py-0 opacity-0"}`}
    >
      <iframe
        ref={frameRef}
        title="Advertisement"
        width="320"
        height="50"
        scrolling="no"
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
        referrerPolicy="strict-origin-when-cross-origin"
        src="/ad-frame/"
        className="block max-w-full border-0"
      />
    </aside>
  );
}
