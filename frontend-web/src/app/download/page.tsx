import type { Metadata } from "next";
import DownloadAppPage from "@/components/DownloadAppPage";
import { getText } from "@/lib/i18n";

const defaultText = getText("en");
const download = defaultText.download;

export const metadata: Metadata = {
  title: `${download.title} | ${defaultText.common.brand}`,
  description: download.description,
  alternates: { canonical: "/download" },
  robots: { index: false, follow: true },
};

export default function DownloadRoute() {
  return <DownloadAppPage />;
}
