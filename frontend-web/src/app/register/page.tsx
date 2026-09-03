import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";
import { getText } from "@/lib/i18n";

const brand = getText("en").common.brand;

export const metadata: Metadata = {
  title: `Create account | ${brand}`,
  description: `Create an ${brand} account to save menu history and order lists.`,
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return <LoginForm mode="register" />;
}
