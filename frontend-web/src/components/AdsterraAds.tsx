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
      const search = new URLSearchParams(location.search);
      const mayLoad = config.enabled
        && config.paths.includes(pathname)
        && !search.has("menu_hash")
        && !search.has("show_recommend");
      const placement = matchMedia("(max-width: 767px)").matches ? config.mobile : config.desktop;
      if (!mayLoad || !placement.key || !placement.scriptUrl) return;

      const container = document.currentScript && document.currentScript.parentElement;
      if (container) container.dataset.adsterraActive = "true";
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
      className="adsterra-slot mx-auto w-full justify-center overflow-hidden px-0 py-5 sm:px-4"
      dangerouslySetInnerHTML={{ __html: `<script>${loader}<\/script>` }}
    />
  );
}
