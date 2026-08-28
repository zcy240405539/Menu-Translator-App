import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Advertisement",
  robots: { index: false, follow: false },
};

function scriptUrl(value: string | undefined) {
  const url = value?.trim() || "";
  if (url.startsWith("//")) return `https:${url}`;
  return url.startsWith("https://") ? url : "";
}

export default function AdFramePage() {
  const key = process.env.NEXT_PUBLIC_ADSTERRA_MOBILE_KEY?.trim() || "";
  const source = scriptUrl(process.env.NEXT_PUBLIC_ADSTERRA_MOBILE_SCRIPT_URL);
  const enabled = process.env.NEXT_PUBLIC_ADSTERRA_ENABLED === "true" && Boolean(key && source);
  const config = JSON.stringify({ enabled, key, source }).replace(/</g, "\\u003c");
  const loader = `
    (() => {
      const config = ${config};
      if (!config.enabled) return;
      const container = document.currentScript && document.currentScript.parentElement;
      const notifyWhenReady = () => {
        if (!container || !container.querySelector("iframe, object, embed, ins")) return false;
        parent.postMessage({ type: "adsterra-ready" }, "*");
        return true;
      };
      const observer = new MutationObserver(() => {
        if (notifyWhenReady()) observer.disconnect();
      });
      if (container) observer.observe(container, { childList: true, subtree: true });
      setTimeout(() => {
        notifyWhenReady();
        observer.disconnect();
      }, 10000);
      window.atOptions = { key: config.key, format: "iframe", height: 50, width: 320, params: {} };
      const source = config.source
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;");
      document.write('<script type="text/javascript" src="' + source + '"><\\/script>');
    })();
  `;

  return (
    <main className="flex h-[50px] min-h-[50px] w-[320px] items-center justify-center overflow-hidden bg-transparent">
      <div dangerouslySetInnerHTML={{ __html: `<script>${loader}<\/script>` }} />
    </main>
  );
}
