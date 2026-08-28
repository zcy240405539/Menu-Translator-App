import { ADSTERRA_CONTENT_PATHS } from "@/lib/adsterra";

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

export default function AdsterraAds({ enabled, desktop, mobile }: AdsterraAdsProps) {
  const config = JSON.stringify({
    enabled,
    paths: ADSTERRA_CONTENT_PATHS,
    desktop,
    mobile,
  }).replace(/</g, "\\u003c");
  const loader = `
    (() => {
      const config = ${config};
      const pathname = location.pathname === "/" ? "/" : location.pathname.replace(/\\/+$/, "");
      const mayLoad = config.enabled
        && config.paths.includes(pathname);
      const placement = matchMedia("(max-width: 767px)").matches ? config.mobile : config.desktop;
      if (!mayLoad || !placement.key || !placement.scriptUrl) return;

      const container = document.currentScript && document.currentScript.parentElement;
      if (container) {
        const observeFooter = () => {
          const footer = document.querySelector("[data-site-footer]");
          if (!footer || !("IntersectionObserver" in window)) return;
          new IntersectionObserver(([entry]) => {
            container.dataset.footerVisible = entry.isIntersecting ? "true" : "false";
          }).observe(footer);
        };
        const revealWhenReady = () => {
          if (!container.querySelector("iframe, object, embed, ins")) return false;
          container.dataset.adsterraActive = "true";
          if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", observeFooter, { once: true });
          } else {
            observeFooter();
          }
          return true;
        };
        const creativeObserver = new MutationObserver(() => {
          if (revealWhenReady()) creativeObserver.disconnect();
        });
        creativeObserver.observe(container, { childList: true, subtree: true });
        setTimeout(() => {
          revealWhenReady();
          creativeObserver.disconnect();
        }, 10000);
      }
      window.atOptions = {
        key: placement.key,
        format: "iframe",
        height: placement.height,
        width: placement.width,
        params: {},
      };
      const source = placement.scriptUrl
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;");
      document.write('<script type="text/javascript" src="' + source + '"><\\/script>');
    })();
  `;

  return (
    <aside
      suppressHydrationWarning
      aria-label="Advertisement"
      className="adsterra-slot"
      dangerouslySetInnerHTML={{ __html: `<script>${loader}<\/script>` }}
    />
  );
}
