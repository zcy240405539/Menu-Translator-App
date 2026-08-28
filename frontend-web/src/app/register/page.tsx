import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Create account | AI Menu APP",
  description: "Create an AI Menu APP account to save menu history and order lists.",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return <LoginForm mode="register" />;
}
