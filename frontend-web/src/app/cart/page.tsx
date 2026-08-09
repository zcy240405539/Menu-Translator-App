import type { Metadata } from "next";
import SavedPage from "@/components/SavedPage";
import { getText } from "@/lib/i18n";

export const metadata: Metadata = { ...getText("en").metadata.cart, robots: { index: false, follow: false } };

export default function CartPage() {
  return <SavedPage mode="cart" />;
}
