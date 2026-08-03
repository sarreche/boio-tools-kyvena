"use client";

import { useFormStatus } from "react-dom";
import { removeSource, retrySource } from "./actions";

function SubmitButton({ children, danger = false }: { children: React.ReactNode; danger?: boolean }) {
  const { pending } = useFormStatus();
  return <button className={danger ? "danger-button" : "ghost-button"} type="submit" disabled={pending}>{pending ? "…" : children}</button>;
}

export function SourceActions({ notebookId, sourceId, status, locale }: { notebookId: string; sourceId: string; status: string; locale: "es" | "en" }) {
  const es = locale === "es";
  const canRetry = status === "ready" || status === "retryable_error";
  const canRemove = status !== "processing";
  return <div className="source-actions">
    {canRetry && <form action={retrySource.bind(null, notebookId, sourceId)}><input type="hidden" name="locale" value={locale} /><SubmitButton>{status === "ready" ? (es ? "Reprocesar" : "Reprocess") : (es ? "Reintentar" : "Retry")}</SubmitButton></form>}
    {canRemove && <form action={removeSource.bind(null, notebookId, sourceId)} onSubmit={event => { if (!window.confirm(es ? "¿Retirar esta fuente y borrar todos sus datos?" : "Remove this source and delete all its data?")) event.preventDefault(); }}><input type="hidden" name="locale" value={locale} /><SubmitButton danger>{status === "pending" ? (es ? "Cancelar" : "Cancel") : (es ? "Retirar" : "Remove")}</SubmitButton></form>}
  </div>;
}
