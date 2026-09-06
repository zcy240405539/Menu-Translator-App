"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ContentPageHeader from "@/components/ContentPageHeader";
import { useText } from "@/hooks/useText";
import { DEFAULT_LANGUAGE, getPageLanguage, replacePageLanguage, type WebLanguageCode } from "@/lib/i18n";
import { getLegalDocument, type LegalKind } from "@/lib/legalDocuments";

const SUPPORT_EMAIL = "support@aimenu.us.kg";

type LegalDocumentProps = {
  kind: LegalKind | "account-deletion";
};

function apiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");
}

function AccountDeletionFlow() {
  const [token, setToken] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(window.localStorage.getItem("menu_app_token"));
  }, []);

  const handleDelete = async () => {
    if (confirmText !== "DELETE") return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${apiBaseUrl()}/auth/account`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Delete failed");
      window.localStorage.removeItem("menu_app_token");
      setDeleted(true);
    } catch {
      alert("Failed to delete account. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (deleted) {
    return (
      <div className="my-8 rounded-2xl bg-green-50 p-8 text-center text-green-800 ring-1 ring-green-200">
        <h3 className="text-xl font-bold">Account Deleted Successfully</h3>
        <p className="mt-2 text-green-700">All your data has been permanently removed.</p>
        <Link href="/" className="mt-6 inline-block rounded-full bg-green-600 px-6 py-2 font-bold text-white hover:bg-green-700">
          Return to Home
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="my-8 rounded-2xl bg-white p-8 text-center ring-1 ring-gray-200">
        <h3 className="text-xl font-bold text-gray-900">Authentication Required</h3>
        <p className="mt-2 text-gray-600">For security reasons, you must log in to permanently delete your account and data.</p>
        <Link 
          href="/login?next=/account-deletion" 
          className="mt-6 inline-block rounded-full bg-purple-700 px-8 py-3 font-bold text-white transition-colors hover:bg-purple-800"
        >
          Log In to Continue
        </Link>
      </div>
    );
  }

  if (!showConfirm) {
    return (
      <div className="my-8 rounded-2xl bg-white p-8 text-center ring-1 ring-red-100">
        <h3 className="text-xl font-bold text-red-600">Danger Zone</h3>
        <p className="mt-2 text-gray-600">This action will permanently delete your account and all your saved data. It cannot be undone.</p>
        <button 
          onClick={() => setShowConfirm(true)} 
          className="mt-6 inline-block rounded-full bg-red-600 px-8 py-3 font-bold text-white transition-colors hover:bg-red-700"
        >
          Delete My Account
        </button>
      </div>
    );
  }

  return (
    <div className="my-8 rounded-2xl bg-red-50 p-8 text-center ring-1 ring-red-200">
      <h3 className="text-xl font-bold text-red-700">Confirm Deletion</h3>
      <p className="mt-2 text-red-600">Type <strong className="font-bold">DELETE</strong> below to confirm.</p>
      <input 
        type="text" 
        value={confirmText} 
        onChange={(e) => setConfirmText(e.target.value)} 
        className="mt-4 w-48 rounded-lg border border-red-300 p-2 text-center text-red-900 outline-none focus:ring-2 focus:ring-red-500" 
        placeholder="DELETE"
      />
      <div className="mt-6 flex justify-center gap-4">
        <button 
          onClick={() => setShowConfirm(false)} 
          className="rounded-full bg-gray-200 px-6 py-2 font-bold text-gray-800 transition-colors hover:bg-gray-300"
        >
          Cancel
        </button>
        <button 
          onClick={handleDelete} 
          disabled={confirmText !== "DELETE" || isDeleting}
          className="rounded-full bg-red-600 px-6 py-2 font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        >
          {isDeleting ? "Deleting..." : "Confirm Delete"}
        </button>
      </div>
    </div>
  );
}

export function LegalDocument({ kind }: LegalDocumentProps) {
  const [lang, setLang] = useState<WebLanguageCode>(DEFAULT_LANGUAGE);
  const isDeletion = kind === "account-deletion";
  const text = useText(lang);
  const legal = text.legal;
  const legalDocument = isDeletion ? null : getLegalDocument(text, kind as LegalKind);
  const documentText = isDeletion ? legal.deletion : legalDocument!;

  useEffect(() => {
    queueMicrotask(() => {
      setLang(getPageLanguage());
    });
  }, []);

  const handleLanguageChange = (nextLang: string) => {
    setLang(replacePageLanguage(nextLang));
  };

  return (
    <main className="min-h-screen bg-[#fbf8f4] text-gray-950">
      <ContentPageHeader lang={lang} onLanguageChange={handleLanguageChange} />
      <div className="mx-auto max-w-3xl px-5 py-12 md:py-16">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-purple-700">{legal.brand}</p>
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-950">{documentText.title}</h1>
        {"subtitle" in documentText && documentText.subtitle && (
          <p className="mt-3 text-lg text-gray-600">{documentText.subtitle}</p>
        )}

        {isDeletion ? (
          <AccountDeletionFlow />
        ) : (
          <p className="mt-8 text-base leading-7 text-gray-700">
            {legalDocument?.intro}
          </p>
        )}

        <div className="mt-8 space-y-8">
          {documentText.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-2xl font-bold text-gray-950">{section.heading}</h2>
              <ul className="mt-4 space-y-3">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-3 text-base leading-7 text-gray-700">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-purple-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="mt-10 text-base text-gray-600">
          {legal.contact}:{" "}
          <a className="font-semibold text-purple-700 hover:text-purple-800" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
        </p>
      </div>
    </main>
  );
}
