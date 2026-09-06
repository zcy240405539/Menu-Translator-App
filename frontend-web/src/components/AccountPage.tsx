"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { History, Settings, ShoppingCart, User, LogOut, ChevronDown } from "lucide-react";
import UtilityPageHeader from "@/components/UtilityPageHeader";
import { useText } from "@/hooks/useText";
import {
  DEFAULT_LANGUAGE,
  applyDocumentLanguage,
  getPageLanguage,
  type WebLanguageCode,
  type Catalog,
} from "@/lib/i18n";

type StoredUser = {
  username?: string;
  email?: string;
};

function storedUser(): StoredUser | null {
  const token = window.localStorage.getItem("menu_app_token") || window.sessionStorage.getItem("menu_app_token");
  const rawUser = window.localStorage.getItem("menu_app_user") || window.sessionStorage.getItem("menu_app_user");
  if (!token || !rawUser) return null;

  try {
    return JSON.parse(rawUser) as StoredUser;
  } catch {
    return null;
  }
}

function apiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");
}

function ChangePasswordModule({ text }: { text: Catalog["settings"] }) {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: "success" | "error" } | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const token = window.localStorage.getItem("menu_app_token");
    if (!token) return;
    fetch(`${apiBaseUrl()}/auth/has-password`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setHasPassword(data.has_password))
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmNewPassword) {
      setMessage({ text: text.passwordsDoNotMatch || "Passwords do not match.", type: "error" });
      return;
    }
    
    setLoading(true);
    setMessage(null);
    const token = window.localStorage.getItem("menu_app_token");
    try {
      const res = await fetch(`${apiBaseUrl()}/auth/password`, {
        method: "PUT",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ old_password: oldPassword || null, new_password: newPassword })
      });
      if (res.ok) {
        setMessage({ text: text.changePasswordSuccess, type: "success" });
        setOldPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        setHasPassword(true);
      } else {
        setMessage({ text: text.changePasswordFailed, type: "error" });
      }
    } catch {
      setMessage({ text: text.changePasswordFailed, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (hasPassword === null) return null;

  const title = hasPassword ? text.changePassword : text.setPassword;

  return (
    <div className="border-t border-purple-100">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full min-h-14 items-center justify-between py-3 font-semibold text-gray-800 hover:text-purple-800"
      >
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-purple-700" />
          {title}
        </div>
        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
      </button>
      
      {isExpanded && (
        <div className="mb-6 px-4 py-4 bg-white rounded-xl shadow-sm border border-purple-50">
          {message && (
            <div className={`mb-4 rounded-md p-3 text-sm ${message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
              {message.text}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
            {hasPassword && (
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">{text.currentPassword}</label>
                <input 
                  type="password" 
                  required 
                  value={oldPassword} 
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-200"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">{text.newPassword}</label>
              <input 
                type="password" 
                required 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">{text.confirmNewPassword || "Confirm New Password"}</label>
              <input 
                type="password" 
                required 
                value={confirmNewPassword} 
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-200"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="mt-2 rounded-full bg-purple-700 px-6 py-2 font-bold text-white hover:bg-purple-800 disabled:opacity-50"
            >
              {loading ? text.updating : title}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function AccountPage() {
  const [lang, setLang] = useState<WebLanguageCode>(DEFAULT_LANGUAGE);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [ready, setReady] = useState(false);
  const text = useText(lang);
  const query = `?lang=${encodeURIComponent(lang)}`;

  useEffect(() => {
    queueMicrotask(() => {
      const nextLang = getPageLanguage();
      const nextUser = storedUser();
      setLang(nextLang);
      if (!nextUser) {
        const accountPath = `/account?lang=${encodeURIComponent(nextLang)}`;
        window.location.replace(`/login?lang=${encodeURIComponent(nextLang)}&next=${encodeURIComponent(accountPath)}`);
        return;
      }
      setUser(nextUser);
      setReady(true);
      applyDocumentLanguage(nextLang);
    });
  }, []);

  useEffect(() => {
    document.title = `${text.nav.account} - ${text.common.brand}`;
  }, [text.common.brand, text.nav.account]);

  const accountLinks = [
    { href: `/history${query}`, label: text.nav.history, icon: History },
    { href: `/cart${query}`, label: text.nav.cart, icon: ShoppingCart },
    { href: `/settings${query}`, label: text.nav.settings, icon: Settings },
  ];

  return (
    <main className="min-h-screen bg-[#fbf8f4] px-4 py-8 text-gray-950">
      <div className="mx-auto max-w-3xl">
        <UtilityPageHeader lang={lang} />

        <h1 className="text-4xl font-extrabold tracking-normal">{text.nav.account}</h1>
        <p className="mt-3 text-lg text-gray-600">{text.settings.accountDescription}</p>

        <section className="mt-10 border-t border-purple-100 py-7">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700">
              <User className="h-6 w-6" />
            </span>

            <div className="min-w-0 flex-1">
              {!ready && <p className="py-2 text-gray-500">{text.saved.loading}</p>}

              {ready && user && (
                <dl className="space-y-4">
                  {user.username && (
                    <div>
                      <dt className="text-sm font-semibold text-gray-500">{text.auth.username}</dt>
                      <dd className="mt-1 break-words text-lg font-bold">{user.username}</dd>
                    </div>
                  )}
                  {user.email && (
                    <div>
                      <dt className="text-sm font-semibold text-gray-500">{text.auth.email}</dt>
                      <dd className="mt-1 break-words text-lg font-bold">{user.email}</dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
          </div>
        </section>

        {ready && user && <ChangePasswordModule text={text.settings} />}

        {ready && user && (
          <nav className="divide-y divide-purple-100 border-t border-b border-purple-100 mb-6" aria-label={text.nav.account}>
            {accountLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="flex min-h-14 items-center gap-3 py-3 font-semibold text-gray-800 hover:text-purple-800">
                <Icon className="h-5 w-5 text-purple-700" />
                {label}
              </Link>
            ))}
            <button
              onClick={() => {
                window.localStorage.removeItem("menu_app_token");
                window.localStorage.removeItem("menu_app_user");
                window.location.assign(`/?lang=${encodeURIComponent(lang)}`);
              }}
              className="flex w-full min-h-14 items-center gap-3 py-3 font-semibold text-red-600 hover:text-red-700"
            >
              <LogOut className="h-5 w-5 text-red-600" />
              {text.auth?.logout || "Logout"}
            </button>
          </nav>
        )}
      </div>
    </main>
  );
}
