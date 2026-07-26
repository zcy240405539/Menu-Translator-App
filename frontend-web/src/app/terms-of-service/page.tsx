import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";

export const metadata: Metadata = {
  title: "Terms of Service | AI Menu APP",
  description: "Terms governing the use of AI Menu APP.",
};

export default function TermsOfServicePage() {
  return <LegalDocument kind="terms" />;
}
