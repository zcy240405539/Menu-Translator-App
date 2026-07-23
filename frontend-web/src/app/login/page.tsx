import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Sign in - AI Menu APP",
  description: "Sign in to AI Menu APP.",
};

export default function LoginPage() {
  return <LoginForm />;
}
