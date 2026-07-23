import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";

export const metadata: Metadata = {
  title: "Account Deletion - AI Menu APP",
  description: "Request deletion of your AI Menu APP account.",
};

export default function AccountDeletionPage() {
  return <LegalDocument kind="account-deletion" />;
}
