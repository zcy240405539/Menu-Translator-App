import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { getText } from "@/lib/i18n";

export const metadata: Metadata = getText("en").metadata.privacy;

export default function PrivacyPolicyPage() {
  return <LegalDocument kind="privacy" />;
}
