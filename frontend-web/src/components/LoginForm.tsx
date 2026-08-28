"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useText } from "@/hooks/useText";
import { DEFAULT_LANGUAGE, LANGUAGES, getPageLanguage, languageLabel, loadText, replacePageLanguage, toBackendLanguage, type WebLanguageCode } from "@/lib/i18n";

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

async function completeOAuthLogin(token: string, fallback: string) {
  window.localStorage.setItem("menu_app_token", token);
  const response = await fetch(`${apiBaseUrl()}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    window.localStorage.removeItem("menu_app_token");
    throw new Error(await readError(response, fallback));
  }
  window.localStorage.setItem("menu_app_user", JSON.stringify(await response.json()));
}

export default function LoginForm({ mode = "login" }: { mode?: "login" | "register" }) {
  const [lang, setLang] = useState<WebLanguageCode>(DEFAULT_LANGUAGE);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const text = useText(lang);
  const isRegister = mode === "register";
  const homeHref = useMemo(() => `/?lang=${encodeURIComponent(lang)}`, [lang]);
  const alternateHref = useMemo(() => `/${isRegister ? "login" : "register"}?lang=${encodeURIComponent(lang)}`, [isRegister, lang]);

  useEffect(() => {
    queueMicrotask(async () => {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const oauthToken = hashParams.get("access_token");
      const nextLang = getPageLanguage();
      setLang(nextLang);

      if (oauthToken) {
        setIsLoading(true);
        const nextText = await loadText(nextLang);
        try {
          await completeOAuthLogin(oauthToken, nextText.auth.loginFailed);
          setStatus(nextText.auth.signedIn);
          window.location.assign(redirectPath(nextLang));
        } catch (err) {
          setError(err instanceof Error ? err.message : nextText.auth.loginFailed);
          setIsLoading(false);
        }
      }
    });
  }, []);

  const handleLanguageChange = (nextLang: string) => {
    setLang(replacePageLanguage(nextLang));
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password || (isRegister && !username.trim())) {
      setError(isRegister ? (text.auth.missingRegistrationFields || "Please enter your name, email, and password.") : text.auth.missingFields);
      return;
    }

    setIsLoading(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch(`${apiBaseUrl()}/auth/${isRegister ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isRegister ? {
          username: username.trim(),
          email,
          password,
          diets: [],
          allergies: [],
          preferred_language: toBackendLanguage(lang),
        } : { email, password }),
      });
      const failureText = isRegister ? (text.auth.registerFailed || "Unable to create your account.") : text.auth.loginFailed;
      if (!res.ok) throw new Error(await readError(res, failureText));
      const data = (await res.json()) as { token?: string; user?: unknown };
      if (!data.token) throw new Error(failureText);
      window.localStorage.setItem("menu_app_token", data.token);
      if (data.user) window.localStorage.setItem("menu_app_user", JSON.stringify(data.user));
      setStatus(isRegister ? (text.auth.registered || "Account created. Redirecting...") : text.auth.signedIn);
      window.location.assign(redirectPath(lang));
    } catch (err) {
      setError(err instanceof Error ? err.message : (isRegister ? (text.auth.registerFailed || "Unable to create your account.") : text.auth.loginFailed));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: "facebook" | "google", fallback: string) => {
    setIsLoading(true);
    setError("");
    try {
      const redirectTo = window.location.href.split("#")[0];
      const res = await fetch(`${apiBaseUrl()}/auth/oauth/${provider}/url?redirect_to=${encodeURIComponent(redirectTo)}`);
      const data = (await res.json()) as { url?: string };
      if (!res.ok || !data.url) throw new Error(fallback);
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => handleOAuthLogin("google", text.auth.googleFailed);
  return (
    <main className="min-h-screen bg-[#fbf8f4] px-4 py-10">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center">
        <Card className="border-purple-100 bg-white shadow-xl">
          <CardContent className="space-y-6 p-8">
            <div className="flex items-start justify-between gap-4">
              <Link href={homeHref} className="inline-flex items-center gap-2">
                <Image src="/ai-menu-logo.png" alt="" width={40} height={40} className="rounded-md" priority />
                <span className="text-xl font-bold text-[#5f259f]">{text.common.brand}</span>
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
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-950">{isRegister ? (text.auth.registerTitle || "Create account") : text.auth.title}</h1>
              <p className="mt-2 text-gray-600">{isRegister ? (text.auth.registerSubtitle || "Create an account to save menu history and order lists.") : text.auth.subtitle}</p>
            </div>

            <form className="space-y-4" onSubmit={handleLogin}>
              {isRegister && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700" htmlFor="username">{text.auth.username || "Name"}</label>
                  <Input id="username" value={username} onChange={(event) => setUsername(event.target.value)} className="h-12" autoComplete="name" />
                </div>
              )}
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
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 pr-11"
                    autoComplete={isRegister ? "new-password" : "current-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-500 transition-colors hover:text-purple-700 focus-visible:outline-2 focus-visible:outline-purple-600"
                    aria-label={showPassword ? text.auth.hidePassword : text.auth.showPassword}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-sm font-medium text-red-500">{error}</p>}
              {status && <p className="text-sm font-medium text-green-600">{status}</p>}

              <Button type="submit" disabled={isLoading} className="h-12 w-full rounded-xl bg-purple-700 text-white hover:bg-purple-800">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isRegister ? (text.auth.registering || "Creating account...") : text.auth.signingIn}
                  </>
                ) : (isRegister ? (text.auth.createAccount || "Create account") : text.auth.signIn)}
              </Button>
            </form>

            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={handleGoogleLogin}
              className="h-12 w-full rounded-xl border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
            >
              <Image src="/google-g-logo.svg" alt="" width={18} height={18} className="mr-2" />
              {text.auth.google}
            </Button>

            <Link href={alternateHref} className="block text-center text-sm font-semibold text-purple-700 hover:text-purple-800">
              {isRegister
                ? (text.auth.hasAccount || "Already have an account? Sign in")
                : (text.auth.newAccountPrompt || "New here? Create an account")}
            </Link>

            <Link href={homeHref} className="block text-center text-sm font-semibold text-purple-700 hover:text-purple-800">
              {text.auth.backHome}
            </Link>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
