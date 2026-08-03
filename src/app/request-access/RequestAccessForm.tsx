"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, PaperPlaneTilt } from "@phosphor-icons/react";
import { LanguageSelect } from "@/components/LanguageSelect";
import { KyvenaLogo } from "@/components/KyvenaLogo";
import { copy, type Locale } from "@/lib/i18n";
import { submitAccessRequest, type RequestState } from "./actions";

const initialState: RequestState = { status: "idle" };

export function RequestAccessForm({ initialLocale }: { initialLocale: Locale }) {
  const [locale, setLocale] = useState(initialLocale);
  const [state, action, pending] = useActionState(submitAccessRequest, initialState);
  const t = copy[locale];

  if (state.status === "success") {
    return (
      <main className="empty-state">
        <div className="empty-state-inner">
          <CheckCircle size={55} weight="fill" color="#16834b" aria-hidden="true" />
          <h1>{t.requestSuccess}</h1>
          <Link className="primary-button" href={`/login?lang=${locale}`}><ArrowLeft size={19} /> {t.backToLogin}</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="request-shell">
      <header className="app-header">
        <KyvenaLogo />
        <LanguageSelect locale={locale} label={t.language} onChange={setLocale} />
      </header>
      <div className="request-main">
        <section className="request-copy"><h1>{t.requestTitle}</h1><p>{t.requestBody}</p></section>
        <form className="request-card auth-form" action={action}>
          <input type="hidden" name="locale" value={locale} />
          <input className="sr-only" tabIndex={-1} autoComplete="off" name="website" aria-hidden="true" />
          <label className="field"><span>{t.name}</span><input name="name" required minLength={2} maxLength={120} autoComplete="name" /></label>
          <label className="field"><span>{t.email}</span><input name="email" type="email" required maxLength={320} autoComplete="email" /></label>
          <label className="field"><span>{t.message}</span><textarea name="message" required minLength={10} maxLength={2000} rows={7} /></label>
          {state.status === "error" ? <p className="form-error" role="alert">{t.requestError}</p> : null}
          <button className="primary-button" disabled={pending}><PaperPlaneTilt size={21} weight="bold" /> {pending ? t.sendingRequest : t.sendRequest}</button>
          <Link className="account-help" href={`/login?lang=${locale}`}><ArrowLeft size={17} style={{ display: "inline" }} /> {t.backToLogin}</Link>
        </form>
      </div>
    </main>
  );
}
