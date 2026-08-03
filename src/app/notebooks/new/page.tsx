import Link from "next/link";
import { KyvenaLogo } from "@/components/KyvenaLogo";
import { copy, isLocale } from "@/lib/i18n";
import { createNotebook } from "../actions";

export default async function NewNotebookPage({ searchParams }: { searchParams: Promise<{ lang?: string; error?: string }> }) {
  const { lang, error } = await searchParams;
  const locale = isLocale(lang) ? lang : "es";
  const t = copy[locale];
  return (
    <main className="request-shell">
      <header className="app-header"><KyvenaLogo /></header>
      <div className="request-main">
        <section className="request-copy"><h1>{t.newNotebook}</h1><p>{locale === "es" ? "Dale un nombre claro. Podrás cambiarlo después." : "Give it a clear name. You can change it later."}</p></section>
        <form className="request-card auth-form" action={createNotebook}>
          {error === "notebook_limit" && <p className="form-error" role="alert">{locale === "es" ? "Alcanzaste el límite de 10 cuadernos." : "You reached the 10-notebook limit."}</p>}
          <input type="hidden" name="locale" value={locale} />
          <label className="field"><span>{locale === "es" ? "Nombre del cuaderno" : "Notebook name"}</span><input name="name" required minLength={1} maxLength={120} autoFocus /></label>
          <button className="primary-button">{locale === "es" ? "Crear cuaderno" : "Create notebook"}</button>
          <Link className="account-help" href={`/notebooks?lang=${locale}`}>{locale === "es" ? "Cancelar" : "Cancel"}</Link>
        </form>
      </div>
    </main>
  );
}
