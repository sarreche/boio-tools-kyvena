import Link from "next/link";
import { redirect } from "next/navigation";
import { KyvenaLogo } from "@/components/KyvenaLogo";
import { INGESTION_LIMITS } from "@/lib/ingestion/limits";
import { isLocale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { addPastedText, completeProcessingSource, preparePendingSource } from "./actions";

export default async function NotebookPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string; error?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const locale = isLocale(query.lang) ? query.lang : "es";
  const supabase = await createClient();
  const { data: notebook } = await supabase.from("notebooks").select("id,name").eq("id", id).maybeSingle();
  if (!notebook) redirect(`/notebooks?lang=${locale}`);
  const { data: sources } = await supabase.from("sources").select("id,title,status,kind,extracted_characters").eq("notebook_id", id).neq("status", "deleted").order("created_at", { ascending: false });
  const es = locale === "es";
  const action = addPastedText.bind(null, id);

  return <>
    <header className="app-header"><KyvenaLogo /><Link className="ghost-button" href={`/notebooks?lang=${locale}`}>{es ? "Cuadernos" : "Notebooks"}</Link></header>
    <main className="home-main">
      <div className="home-heading"><div><h1>{notebook.name}</h1><p>{es ? "Agregá fuentes para preparar este cuaderno." : "Add sources to prepare this notebook."}</p></div></div>
      {query.error && <p className="form-error" role="alert">{es ? "No pudimos agregar el texto. Revisá el contenido y el límite indicado." : "We could not add the text. Check its content and the stated limit."}</p>}
      <section className="ingestion-grid">
        <div className="request-card"><h2>{es ? "Pegar texto" : "Paste text"}</h2><p>{es ? `Hasta ${INGESTION_LIMITS.maxPastedTextCharacters.toLocaleString("es-UY")} caracteres.` : `Up to ${INGESTION_LIMITS.maxPastedTextCharacters.toLocaleString("en-US")} characters.`}</p>
          <form className="auth-form" action={action}><input type="hidden" name="locale" value={locale} /><label className="field">{es ? "Título (opcional)" : "Title (optional)"}<input name="title" maxLength={240} /></label><label className="field">{es ? "Contenido" : "Content"}<textarea name="content" required maxLength={INGESTION_LIMITS.maxPastedTextCharacters} rows={10} /></label><button className="primary-button" type="submit">{es ? "Agregar a la cola" : "Add to queue"}</button></form>
        </div>
        <div className="request-card"><h2>{es ? "Fuentes" : "Sources"}</h2>{sources?.length ? <div className="source-list">{sources.map(source => <article key={source.id}><strong>{source.title}</strong><span>{source.status} · {source.extracted_characters ?? 0} {es ? "caracteres" : "characters"}</span>{source.status === "pending" && <form action={preparePendingSource.bind(null, id, source.id)}><input type="hidden" name="locale" value={locale} /><button className="ghost-button" type="submit">{es ? "Preparar" : "Prepare"}</button></form>}{source.status === "processing" && <form action={completeProcessingSource.bind(null, id, source.id)}><input type="hidden" name="locale" value={locale} /><button className="ghost-button" type="submit">{es ? "Generar embeddings" : "Generate embeddings"}</button></form>}</article>)}</div> : <p>{es ? "Todavía no hay fuentes." : "There are no sources yet."}</p>}</div>
      </section>
    </main>
  </>;
}
