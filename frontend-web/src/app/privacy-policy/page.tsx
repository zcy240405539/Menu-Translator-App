import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";

export const metadata: Metadata = {
  title: "Privacy Policy - AnyMenu",
  description: "Privacy Policy for AnyMenu.",
};

export default function PrivacyPolicyPage() {
  return <LegalDocument kind="privacy" />;
}
