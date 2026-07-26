import type { Metadata } from "next";
import SettingsPage from "@/components/SettingsPage";
import { getText } from "@/lib/i18n";

export const metadata: Metadata = getText("en").metadata.settings;

export default function SettingsRoute() {
  return <SettingsPage />;
}
