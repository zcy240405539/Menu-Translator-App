import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | AI MenuLens",
  alternates: { canonical: "/privacy-policy/" },
  robots: { index: false, follow: true },
};

export default function OldPrivacyPolicyPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <meta httpEquiv="refresh" content="0;url=/privacy-policy/" />
      <h1 className="text-2xl font-bold">Privacy Policy moved</h1>
      <p>This address has moved to the current AI MenuLens privacy policy.</p>
      <Link className="font-semibold text-purple-700 underline" href="/privacy-policy/">
        Open the Privacy Policy
      </Link>
    </main>
  );
}
