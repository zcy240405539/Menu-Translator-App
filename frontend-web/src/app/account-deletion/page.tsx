import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { getText } from "@/lib/i18n";

export const metadata: Metadata = getText("en").metadata.deletion;

export default function AccountDeletionPage() {
  return <LegalDocument kind="account-deletion" />;
}
