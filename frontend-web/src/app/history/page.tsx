import type { Metadata } from "next";
import SavedPage from "@/components/SavedPage";

export const metadata: Metadata = {
  title: "History - AI Menu APP",
  description: "Saved menu history for AI Menu APP.",
};

export default function HistoryPage() {
  return <SavedPage mode="history" />;
}
