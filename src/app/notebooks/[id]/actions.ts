"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { INGESTION_LIMITS, normalizePastedText } from "@/lib/ingestion/limits";
import { completeIngestion, prepareIngestion } from "@/lib/ingestion/service";
import { SupabaseIngestionRepository } from "@/lib/ingestion/supabase-repository";
import { createClient } from "@/lib/supabase/server";

export async function addPastedText(notebookId: string, formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const content = normalizePastedText(String(formData.get("content") ?? ""));
  const title = String(formData.get("title") ?? "").trim() || (locale === "en" ? "Pasted text" : "Texto pegado");
  const fail = (code: string): never => redirect(`/notebooks/${notebookId}?lang=${locale}&error=${code}`);

  if (!content) fail("empty_text");
  if (content.length > INGESTION_LIMITS.maxPastedTextCharacters) fail("text_too_long");
  if (title.length > 240) fail("title_too_long");

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const ownerId = claimsData?.claims?.sub;
  if (!ownerId) redirect("/login");

  const { data: notebook } = await supabase.from("notebooks").select("id").eq("id", notebookId).maybeSingle();
  if (!notebook) fail("notebook_not_found");

  const { count } = await supabase.from("sources").select("id", { count: "exact", head: true }).eq("notebook_id", notebookId).neq("status", "deleted");
  if ((count ?? 0) >= INGESTION_LIMITS.maxSourcesPerNotebook) fail("source_limit");

  const contentHash = createHash("sha256").update(content).digest("hex");
  const idempotencyKey = `pasted:${notebookId}:${contentHash}`;
  const { data: existing } = await supabase.from("ingestion_jobs").select("source_id").eq("idempotency_key", idempotencyKey).maybeSingle();
  if (existing) redirect(`/notebooks/${notebookId}?lang=${locale}`);

  const { data: source, error: sourceError } = await supabase.from("sources").insert({
    owner_id: ownerId, notebook_id: notebookId, kind: "pasted_text", status: "pending", title,
    content_hash: contentHash, extracted_text: content, extracted_characters: content.length,
  }).select("id").single();
  if (sourceError || !source) fail("save_failed");
  const sourceId = source!.id;

  const { error: jobError } = await supabase.from("ingestion_jobs").insert({
    owner_id: ownerId, notebook_id: notebookId, source_id: sourceId, idempotency_key: idempotencyKey,
  });
  if (jobError) {
    await supabase.from("sources").delete().eq("id", sourceId);
    fail("save_failed");
  }

  revalidatePath(`/notebooks/${notebookId}`);
  redirect(`/notebooks/${notebookId}?lang=${locale}`);
}

export async function completeProcessingSource(notebookId: string, sourceId: string, formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const ownerId = claimsData?.claims?.sub;
  if (!ownerId) redirect("/login");
  const { data: job } = await supabase.from("ingestion_jobs").select("id").eq("source_id", sourceId).eq("notebook_id", notebookId).eq("owner_id", ownerId).eq("stage", "embedding").maybeSingle();
  if (job) await completeIngestion(new SupabaseIngestionRepository(supabase), { id: job.id, sourceId, notebookId, ownerId });
  revalidatePath(`/notebooks/${notebookId}`);
  redirect(`/notebooks/${notebookId}?lang=${locale}`);
}

export async function preparePendingSource(notebookId: string, sourceId: string, formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const ownerId = claimsData?.claims?.sub;
  if (!ownerId) redirect("/login");
  const { data: job } = await supabase.from("ingestion_jobs").select("id").eq("source_id", sourceId).eq("notebook_id", notebookId).eq("owner_id", ownerId).eq("stage", "queued").maybeSingle();
  if (job) await prepareIngestion(new SupabaseIngestionRepository(supabase), { id: job.id, sourceId, notebookId, ownerId });
  revalidatePath(`/notebooks/${notebookId}`);
  redirect(`/notebooks/${notebookId}?lang=${locale}`);
}
