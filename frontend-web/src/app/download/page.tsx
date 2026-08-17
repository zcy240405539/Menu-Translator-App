import type { Metadata } from "next";
import DownloadAppPage from "@/components/DownloadAppPage";
import { getText } from "@/lib/i18n";

const download = getText("en").download;

export const metadata: Metadata = {
  title: `${download.title} | AI Menu APP`,
  description: download.description,
  alternates: { canonical: "/download" },
  robots: { index: false, follow: true },
};

export default function DownloadRoute() {
  return <DownloadAppPage />;
}
