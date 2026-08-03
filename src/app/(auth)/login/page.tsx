"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeSlash, LockKey, PaperPlaneTilt, ShieldCheck, Sparkle } from "@phosphor-icons/react";
import { KyvenaLogo } from "@/components/KyvenaLogo";
import { LanguageSelect } from "@/components/LanguageSelect";
import { copy, isLocale, type Locale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export default function LoginPage() {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>("es");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const t = copy[locale];

  useEffect(() => {
    const queryLocale = new URLSearchParams(window.location.search).get("lang");
    if (isLocale(queryLocale)) {
      setLocale(queryLocale);
      return;
    }
    const saved = window.localStorage.getItem("kyvena-locale");
    const browser = navigator.language.split("-")[0];
    setLocale(isLocale(saved) ? saved : isLocale(browser) ? browser : "es");
  }, []);

  function changeLocale(next: Locale) {
    setLocale(next);
    window.localStorage.setItem("kyvena-locale", next);
  }

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasSupabaseConfig()) {
      setError(t.configurationError);
      return;
    }
    setLoading(true);
    setError("");
    const { error: authError } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (authError) {
      setError(t.invalidCredentials);
      setLoading(false);
      return;
    }
    router.replace(`/notebooks?lang=${locale}`);
    router.refresh();
  }

  return (
    <main className="auth-shell">
      <section className="auth-story">
        <KyvenaLogo />
        <div className="auth-story-copy">
          <Sparkle size={34} weight="fill" color="#f5b700" aria-hidden="true" />
          <h1>{t.heroTitle}</h1>
          <p>{t.heroBody}</p>
        </div>
        <div className="story-network"><KyvenaLogo compact /></div>
      </section>

      <section className="auth-form-side">
        <div className="auth-top">
          <div className="mobile-brand"><KyvenaLogo /></div>
          <LanguageSelect locale={locale} label={t.language} onChange={changeLocale} />
        </div>
        <div className="auth-card">
          <h2>{t.signIn}</h2>
          <p>{t.signInBody}</p>
          <form className="auth-form" onSubmit={signIn}>
            <label className="field">
              <span>{t.email}</span>
              <input type="email" autoComplete="email" required autoFocus disabled={loading} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@ejemplo.com" />
            </label>
            <label className="field">
              <span>{t.password}</span>
              <div className="password-wrap">
                <LockKey size={21} color="#1261ff" aria-hidden="true" style={{ position: "absolute", left: 16, top: 18 }} />
                <input style={{ paddingLeft: 48 }} type={showPassword ? "text" : "password"} autoComplete="current-password" required disabled={loading} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t.passwordPlaceholder} />
                <button className="password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? t.hidePassword : t.showPassword}>
                  {showPassword ? <EyeSlash size={22} /> : <Eye size={22} />}
                </button>
              </div>
            </label>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <button className="primary-button" type="submit" disabled={loading}>
              <PaperPlaneTilt size={21} weight="bold" aria-hidden="true" />
              {loading ? t.submitting : t.submit}
            </button>
          </form>
          <p className="account-help">{t.accessPrompt} <Link href={`/request-access?lang=${locale}`}>{t.requestAccess}</Link></p>
          <div className="privacy-note"><ShieldCheck size={22} color="#1261ff" aria-hidden="true" /> {t.privacy}</div>
        </div>
      </section>
    </main>
  );
}
