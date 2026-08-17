import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { getText } from "@/lib/i18n";

export const metadata: Metadata = {
  ...getText("en").metadata.terms,
  alternates: { canonical: "/terms-of-service" },
};

export default function TermsOfServicePage() {
  return <LegalDocument kind="terms" />;
}
