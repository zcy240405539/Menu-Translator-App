"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DEFAULT_LANGUAGE, LANGUAGES, getInitialLanguage, getText, languageLabel, normalizeLanguage, saveLanguage, type WebLanguageCode } from "@/lib/i18n";

function apiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");
}

function redirectPath(lang: WebLanguageCode) {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");
  return next?.startsWith("/") ? next : `/?lang=${encodeURIComponent(lang)}`;
}

async function readError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null) as { detail?: string; message?: string } | null;
  return body?.detail || body?.message || fallback;
}

export default function LoginForm() {
  const [lang, setLang] = useState<WebLanguageCode>(DEFAULT_LANGUAGE);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const text = getText(lang);
  const homeHref = useMemo(() => `/?lang=${encodeURIComponent(lang)}`, [lang]);

  useEffect(() => {
    queueMicrotask(() => {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const oauthToken = hashParams.get("access_token");
      const params = new URLSearchParams(window.location.search);
      const nextLang = normalizeLanguage(params.get("lang") || getInitialLanguage());
      setLang(nextLang);

      if (oauthToken) {
        window.localStorage.setItem("menu_app_token", oauthToken);
        setStatus(getText(nextLang).auth.signedIn);
        window.location.assign(redirectPath(nextLang));
      }
    });
  }, []);

  const handleLanguageChange = (nextLang: string) => {
    const normalizedLang = normalizeLanguage(nextLang);
    setLang(normalizedLang);
    saveLanguage(normalizedLang);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", normalizedLang);
    window.history.replaceState({}, "", url.toString());
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) {
      setError(text.auth.missingFields);
      return;
    }

    setIsLoading(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch(`${apiBaseUrl()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error(await readError(res, text.auth.loginFailed));
      const data = (await res.json()) as { token?: string; user?: unknown };
      if (!data.token) throw new Error(text.auth.loginFailed);
      window.localStorage.setItem("menu_app_token", data.token);
      if (data.user) window.localStorage.setItem("menu_app_user", JSON.stringify(data.user));
      setStatus(text.auth.signedIn);
      window.location.assign(redirectPath(lang));
    } catch (err) {
      setError(err instanceof Error ? err.message : text.auth.loginFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");
    try {
      const redirectTo = window.location.href.split("#")[0];
      const res = await fetch(`${apiBaseUrl()}/auth/google/url?redirect_to=${encodeURIComponent(redirectTo)}`);
      const data = (await res.json()) as { url?: string };
      if (!res.ok || !data.url) throw new Error(text.auth.googleFailed);
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : text.auth.googleFailed);
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fbf8f4] px-4 py-10">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center">
        <Card className="border-purple-100 bg-white shadow-xl">
          <CardContent className="space-y-6 p-8">
            <div className="flex items-start justify-between gap-4">
              <Link href={homeHref} className="inline-flex items-center gap-2">
                <Image src="/ai-menu-logo.png" alt="" width={40} height={40} className="rounded-md" priority />
                <span className="text-xl font-bold text-[#5f259f]">AI Menu APP</span>
              </Link>
              <label className="relative flex h-9 w-9 cursor-pointer items-center justify-center text-gray-700 transition-colors hover:text-purple-600" aria-label={text.nav.language}>
                <Globe className="h-5 w-5" />
                <select
                  aria-label={text.nav.language}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  value={lang}
                  onChange={(event) => handleLanguageChange(event.target.value)}
                >
                  {LANGUAGES.map((option) => (
                    <option key={option.code} value={option.code}>
                      {languageLabel(lang, option.code)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-950">{text.auth.title}</h1>
              <p className="mt-2 text-gray-600">{text.auth.subtitle}</p>
            </div>

            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700" htmlFor="email">{text.auth.email}</label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700" htmlFor="password">{text.auth.password}</label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12"
                  autoComplete="current-password"
                />
              </div>

              {error && <p className="text-sm font-medium text-red-500">{error}</p>}
              {status && <p className="text-sm font-medium text-green-600">{status}</p>}

              <Button type="submit" disabled={isLoading} className="h-12 w-full rounded-xl bg-purple-700 text-white hover:bg-purple-800">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {text.auth.signingIn}
                  </>
                ) : text.auth.signIn}
              </Button>
            </form>

            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={handleGoogleLogin}
              className="h-12 w-full rounded-xl border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
            >
              {text.auth.google}
            </Button>

            <Link href={homeHref} className="block text-center text-sm font-semibold text-purple-700 hover:text-purple-800">
              {text.auth.backHome}
            </Link>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
