import Link from "next/link";
import { redirect } from "next/navigation";
import { KyvenaLogo } from "@/components/KyvenaLogo";
import { INGESTION_LIMITS } from "@/lib/ingestion/limits";
import { isLocale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { addPastedText } from "./actions";
import { FileUploadForm } from "./FileUploadForm";
import { SourceActions } from "./SourceActions";

export default async function NotebookPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string; error?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const locale = isLocale(query.lang) ? query.lang : "es";
  const supabase = await createClient();
  const { data: notebook } = await supabase.from("notebooks").select("id,name").eq("id", id).maybeSingle();
  if (!notebook) redirect(`/notebooks?lang=${locale}`);
  const { data: sources } = await supabase.from("sources").select("id,title,status,kind,extracted_characters,error_code").eq("notebook_id", id).neq("status", "deleted").order("created_at", { ascending: false });
  const es = locale === "es";
  const action = addPastedText.bind(null, id);
  const errorMessages: Record<string, { es: string; en: string }> = {
    files_required: { es: "Seleccioná al menos un archivo.", en: "Select at least one file." },
    too_many_files: { es: "Podés seleccionar hasta tres archivos por vez.", en: "You can select up to three files at a time." },
    file_too_large: { es: "El archivo supera el límite de 5 MB.", en: "The file exceeds the 5 MB limit." },
    file_name_too_long: { es: "El nombre del archivo es demasiado largo.", en: "The file name is too long." },
    unsupported_file_type: { es: "Usá un archivo TXT, MD o PDF.", en: "Use a TXT, MD, or PDF file." },
    invalid_file_content: { es: "El contenido no coincide con un archivo válido del tipo indicado.", en: "The content is not a valid file of the indicated type." },
    too_many_pages: { es: "El PDF supera el límite de 75 páginas.", en: "The PDF exceeds the 75-page limit." },
    content_too_long: { es: "El texto extraído supera los 250.000 caracteres.", en: "The extracted text exceeds 250,000 characters." },
    pdf_text_required: { es: "El PDF no contiene texto seleccionable. El MVP todavía no admite OCR.", en: "The PDF has no selectable text. OCR is not supported in the MVP yet." },
    ingestion_busy: { es: "Ya hay una fuente en procesamiento. Esperá a que termine.", en: "Another source is already processing. Wait for it to finish." },
    daily_ingestion_limit: { es: "Alcanzaste el límite diario de ingestas.", en: "You reached the daily ingestion limit." },
    total_source_limit: { es: "Alcanzaste el límite total de 75 fuentes.", en: "You reached the total limit of 75 sources." },
    storage_limit: { es: "Alcanzaste el límite de 50 MB de archivos originales.", en: "You reached the 50 MB original-file storage limit." },
    retry_limit: { es: "Esta fuente alcanzó el límite de reintentos.", en: "This source reached its retry limit." },
    delete_failed: { es: "No pudimos retirar la fuente sin riesgo de dejar datos huérfanos.", en: "We could not remove the source without risking orphaned data." },
    source_busy: { es: "La fuente está procesándose y todavía no puede retirarse.", en: "The source is processing and cannot be removed yet." },
  };
  const visibleError = query.error ? errorMessages[query.error]?.[locale] ?? (es ? "No pudimos procesar la fuente. Revisá el archivo e intentá de nuevo." : "We could not process the source. Check the file and try again.") : null;
  const statusLabels: Record<string, { es: string; en: string }> = {
    pending: { es: "Pendiente", en: "Pending" }, processing: { es: "Procesando", en: "Processing" }, ready: { es: "Lista", en: "Ready" },
    retryable_error: { es: "Error recuperable", en: "Recoverable error" }, permanent_error: { es: "Error definitivo", en: "Permanent error" },
  };
  const sourceErrorLabels: Record<string, { es: string; en: string }> = {
    ingestion_abandoned: { es: "La ingesta quedó interrumpida; podés reintentarla.", en: "Ingestion was interrupted; you can retry it." },
    pdf_text_required: { es: "El PDF no contiene texto seleccionable.", en: "The PDF has no selectable text." },
    embedding_network_error: { es: "El proveedor de embeddings no respondió.", en: "The embedding provider did not respond." },
    ingestion_timeout: { es: "La ingesta superó el tiempo permitido.", en: "Ingestion exceeded its time budget." },
  };

  return <>
    <header className="app-header"><KyvenaLogo /><Link className="ghost-button" href={`/notebooks?lang=${locale}`}>{es ? "Cuadernos" : "Notebooks"}</Link></header>
    <main className="home-main">
      <div className="home-heading"><div><h1>{notebook.name}</h1><p>{es ? "Agregá fuentes para preparar este cuaderno." : "Add sources to prepare this notebook."}</p></div></div>
      {visibleError && <p className="form-error" role="alert">{visibleError}</p>}
      <section className="ingestion-grid">
        <div className="request-card"><h2>{es ? "Subir archivos" : "Upload files"}</h2><p>{es ? `TXT, MD o PDF con texto. Hasta ${INGESTION_LIMITS.maxFilesPerSelection} archivos de 5 MB, procesados en orden.` : `TXT, MD, or text-based PDF. Up to ${INGESTION_LIMITS.maxFilesPerSelection} files of 5 MB, processed in order.`}</p>
          <FileUploadForm notebookId={id} locale={locale} />
        </div>
        <div className="request-card"><h2>{es ? "Pegar texto" : "Paste text"}</h2><p>{es ? `Hasta ${INGESTION_LIMITS.maxPastedTextCharacters.toLocaleString("es-UY")} caracteres.` : `Up to ${INGESTION_LIMITS.maxPastedTextCharacters.toLocaleString("en-US")} characters.`}</p>
          <form className="auth-form" action={action}><input type="hidden" name="locale" value={locale} /><label className="field">{es ? "Título (opcional)" : "Title (optional)"}<input name="title" maxLength={240} /></label><label className="field">{es ? "Contenido" : "Content"}<textarea name="content" required maxLength={INGESTION_LIMITS.maxPastedTextCharacters} rows={10} /></label><button className="primary-button" type="submit">{es ? "Agregar a la cola" : "Add to queue"}</button></form>
        </div>
        <div className="request-card"><h2>{es ? "Fuentes" : "Sources"}</h2>{sources?.length ? <div className="source-list">{sources.map(source => <article key={source.id}><strong>{source.title}</strong><span>{statusLabels[source.status]?.[locale] ?? source.status} · {source.extracted_characters ?? 0} {es ? "caracteres" : "characters"}</span>{source.error_code && <span>{sourceErrorLabels[source.error_code]?.[locale] ?? (es ? "No pudimos procesar esta fuente." : "We could not process this source.")}</span>}<SourceActions notebookId={id} sourceId={source.id} status={source.status} locale={locale} /></article>)}</div> : <p>{es ? "Todavía no hay fuentes." : "There are no sources yet."}</p>}</div>
      </section>
    </main>
  </>;
}
