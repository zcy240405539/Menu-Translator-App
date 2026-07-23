import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";

export const metadata: Metadata = {
  title: "Privacy Policy - AI Menu APP",
  description: "Privacy Policy for AI Menu APP.",
};

export default function PrivacyPolicyPage() {
  return <LegalDocument kind="privacy" />;
}
