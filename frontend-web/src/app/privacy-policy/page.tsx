import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";

export const metadata: Metadata = {
  title: "Privacy Policy - AIMenuAPP",
  description: "Privacy Policy for AIMenuAPP.",
};

export default function PrivacyPolicyPage() {
  return <LegalDocument kind="privacy" />;
}
