import type { Metadata } from "next";
import SavedPage from "@/components/SavedPage";
import { getText } from "@/lib/i18n";

export const metadata: Metadata = getText("en").metadata.cart;

export default function CartPage() {
  return <SavedPage mode="cart" />;
}
