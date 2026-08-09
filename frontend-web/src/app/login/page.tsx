import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";
import { getText } from "@/lib/i18n";

export const metadata: Metadata = { ...getText("en").metadata.login, robots: { index: false, follow: false } };

export default function LoginPage() {
  return <LoginForm />;
}
