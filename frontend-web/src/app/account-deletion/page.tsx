import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";

export const metadata: Metadata = {
  title: "Account Deletion - AIMenuAPP",
  description: "Request deletion of your AIMenuAPP account.",
};

export default function AccountDeletionPage() {
  return <LegalDocument kind="account-deletion" />;
}
