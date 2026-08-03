"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { INGESTION_LIMITS } from "@/lib/ingestion/limits";
import { createClient } from "@/lib/supabase/client";
import { cancelReservedFile, processUploadedFile, reserveFileUpload } from "./actions";

export function FileUploadForm({ notebookId, locale }: { notebookId: string; locale: "es" | "en" }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const es = locale === "es";
  const messages: Record<string, string> = {
    files_required: es ? "Seleccioná al menos un archivo." : "Select at least one file.",
    too_many_files: es ? "Podés seleccionar hasta tres archivos por vez." : "You can select up to three files at a time.",
    file_too_large: es ? "Cada archivo debe pesar como máximo 5 MB." : "Each file must be no larger than 5 MB.",
    file_name_too_long: es ? "El nombre del archivo es demasiado largo." : "The file name is too long.",
    unsupported_file_type: es ? "Usá archivos TXT, MD o PDF." : "Use TXT, MD, or PDF files.",
    invalid_file_content: es ? "El contenido no coincide con el tipo de archivo indicado." : "The content does not match the indicated file type.",
    too_many_pages: es ? "El PDF supera el límite de 75 páginas." : "The PDF exceeds the 75-page limit.",
    content_too_long: es ? "El texto extraído supera los 250.000 caracteres." : "The extracted text exceeds 250,000 characters.",
    pdf_text_required: es ? "El PDF no tiene texto seleccionable; el MVP todavía no admite OCR." : "The PDF has no selectable text; OCR is not supported in the MVP yet.",
    source_limit: es ? "El cuaderno alcanzó el límite de 20 fuentes." : "The notebook reached its 20-source limit.",
    total_source_limit: es ? "Alcanzaste el límite total de 75 fuentes." : "You reached the total limit of 75 sources.",
    storage_limit: es ? "Alcanzaste el límite de 50 MB de archivos originales." : "You reached the 50 MB original-file storage limit.",
    ingestion_busy: es ? "Ya hay una fuente en procesamiento. Esperá a que termine." : "Another source is already processing. Wait for it to finish.",
    daily_ingestion_limit: es ? "Alcanzaste el límite diario de ingestas." : "You reached the daily ingestion limit.",
    upload_failed: es ? "No pudimos subir el archivo. Intentá de nuevo." : "We could not upload the file. Try again.",
    file_ingestion_failed: es ? "No pudimos procesar el archivo. Intentá de nuevo." : "We could not process the file. Try again.",
  };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const files = Array.from(inputRef.current?.files ?? []);
    if (!files.length) { setMessage(messages.files_required); return; }
    if (files.length > INGESTION_LIMITS.maxFilesPerSelection) { setMessage(messages.too_many_files); return; }
    setBusy(true);
    setMessage(es ? "Procesando archivos en orden…" : "Processing files in order…");
    const supabase = createClient();
    let firstError: string | undefined;
    for (const file of files) {
      if (file.size > INGESTION_LIMITS.maxFileBytes) { firstError ??= "file_too_large"; continue; }
      const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
      const reservation = await reserveFileUpload(notebookId, { name: file.name, size: file.size, hash });
      if (reservation.status === "duplicate") continue;
      if (reservation.status === "error") { firstError ??= reservation.code; continue; }
      if (reservation.status !== "reserved" || !reservation.storagePath) { firstError ??= "file_ingestion_failed"; continue; }
      const { error: uploadError } = await supabase.storage.from("sources").upload(reservation.storagePath, file, { contentType: reservation.contentType, upsert: false });
      if (uploadError) { firstError ??= "upload_failed"; await cancelReservedFile(notebookId, reservation.sourceId); continue; }
      const processed = await processUploadedFile(notebookId, reservation.sourceId);
      if (processed.status === "error") firstError ??= processed.code;
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    setMessage(firstError ? messages[firstError] ?? messages.file_ingestion_failed : (es ? "Archivos procesados correctamente." : "Files processed successfully."));
    router.refresh();
  }

  return <form className="auth-form" onSubmit={submit}>
    <label className="field">{es ? "Archivos" : "Files"}<input ref={inputRef} name="files" type="file" accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf" multiple required disabled={busy} /></label>
    <button className="primary-button" type="submit" disabled={busy}>{busy ? (es ? "Procesando…" : "Processing…") : (es ? "Subir y procesar" : "Upload and process")}</button>
    {message && <p className={busy ? "" : "form-message"} aria-live="polite">{message}</p>}
  </form>;
}
