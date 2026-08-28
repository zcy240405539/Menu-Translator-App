"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

function scriptUrl(value: string | undefined) {
  const url = value?.trim() || "";
  if (url.startsWith("//")) return `https:${url}`;
  return url.startsWith("https://") ? url : "";
}

export default function InlineAdsterraAd() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const frameId = useId().replace(/:/g, "");
  const [ready, setReady] = useState(false);
  const enabled = process.env.NEXT_PUBLIC_ADSTERRA_ENABLED === "true";
  const key = process.env.NEXT_PUBLIC_ADSTERRA_MOBILE_KEY?.trim() || "";
  const source = scriptUrl(process.env.NEXT_PUBLIC_ADSTERRA_MOBILE_SCRIPT_URL);
  const frameHtml = useMemo(() => {
    if (!enabled || !key || !source) return "";
    const options = JSON.stringify({ key, format: "iframe", height: 50, width: 320, params: {} }).replace(/</g, "\\u003c");
    const safeSource = JSON.stringify(source).replace(/</g, "\\u003c");
    const safeId = JSON.stringify(frameId);
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;overflow:hidden;background:transparent}</style></head><body><script>(()=>{const notify=()=>{if(document.querySelector('iframe,object,embed,ins'))parent.postMessage({type:'adsterra-ready',id:${safeId}},'*')};new MutationObserver(notify).observe(document.documentElement,{childList:true,subtree:true});setTimeout(notify,10000)})()<\/script><script>window.atOptions=${options}<\/script><script src=${safeSource}><\/script></body></html>`;
  }, [enabled, frameId, key, source]);

  useEffect(() => {
    if (!frameHtml) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type === "adsterra-ready" && event.data?.id === frameId) setReady(true);
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [frameHtml, frameId]);

  if (!frameHtml) return null;

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
        srcDoc={frameHtml}
        className="block max-w-full border-0"
      />
    </aside>
  );
}
