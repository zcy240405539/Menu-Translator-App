import type { Metadata } from "next";
import SavedPage from "@/components/SavedPage";

export const metadata: Metadata = {
  title: "Cart - AI Menu APP",
  description: "Saved order list for AI Menu APP.",
};

export default function CartPage() {
  return <SavedPage mode="cart" />;
}
