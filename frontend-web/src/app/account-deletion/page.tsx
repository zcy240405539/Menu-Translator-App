import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";

export const metadata: Metadata = {
  title: "Account Deletion - AnyMenu",
  description: "Request deletion of your AnyMenu account.",
};

export default function AccountDeletionPage() {
  return <LegalDocument kind="account-deletion" />;
}
