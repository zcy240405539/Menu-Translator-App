import type { Metadata } from "next";
import SettingsPage from "@/components/SettingsPage";

export const metadata: Metadata = {
  title: "Settings | AI Menu APP",
  description: "Manage AI Menu APP website settings and legal information.",
};

export default function SettingsRoute() {
  return <SettingsPage />;
}
