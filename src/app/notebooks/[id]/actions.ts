"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { INGESTION_LIMITS, normalizePastedText } from "@/lib/ingestion/limits";
import { extractFile, FileIngestionError, identifyFile, type ApprovedFileKind } from "@/lib/ingestion/file-extraction";
import { getDailyIngestionLimit } from "@/lib/ingestion/server-config";
import { completeIngestion, prepareIngestion } from "@/lib/ingestion/service";
import { SupabaseIngestionRepository } from "@/lib/ingestion/supabase-repository";
import { createClient } from "@/lib/supabase/server";

const contentTypes: Record<ApprovedFileKind, string> = { txt: "text/plain", md: "text/markdown", pdf: "application/pdf" };
type RpcResult = { status: "reserved"; sourceId: string; storagePath: string | null } | { status: "queued" | "duplicate" } | { status: "error"; code: string };

function asRpcResult(value: unknown): RpcResult {
  return value as RpcResult;
}

export async function reserveFileUpload(notebookId: string, input: { name: string; size: number; hash: string }) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const ownerId = claimsData?.claims?.sub;
  if (!ownerId) return { status: "error" as const, code: "authentication_required" };
  if (!input.name || input.name.length > INGESTION_LIMITS.maxFileNameCharacters) return { status: "error" as const, code: "file_name_too_long" };
  if (input.size < 1 || input.size > INGESTION_LIMITS.maxFileBytes) return { status: "error" as const, code: "file_too_large" };
  if (!/^[a-f0-9]{64}$/.test(input.hash)) return { status: "error" as const, code: "invalid_file_content" };
  const kind = ({ txt: "txt", md: "md", pdf: "pdf" } as const)[input.name.split(".").pop()?.toLowerCase() as "txt" | "md" | "pdf"];
  if (!kind) return { status: "error" as const, code: "unsupported_file_type" };
  const { data, error } = await supabase.rpc("reserve_ingestion_source", {
    p_notebook_id: notebookId, p_kind: kind, p_title: input.name, p_content_hash: input.hash,
    p_byte_size: input.size, p_mime_type: contentTypes[kind], p_daily_limit: getDailyIngestionLimit(),
  });
  if (error) return { status: "error" as const, code: "save_failed" };
  const result = asRpcResult(data);
  return result.status === "reserved" && result.storagePath
    ? { ...result, contentType: contentTypes[kind] }
    : result.status === "reserved" ? { status: "error" as const, code: "save_failed" } : result;
}

async function processSource(notebookId: string, sourceId: string) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const ownerId = claimsData?.claims?.sub;
  if (!ownerId) return { status: "error" as const, code: "authentication_required" };
  const { data: source } = await supabase.from("sources").select("id,kind,storage_path").eq("id", sourceId).eq("notebook_id", notebookId).eq("owner_id", ownerId).eq("status", "pending").maybeSingle();
  if (!source) return { status: "error" as const, code: "source_not_found" };
  try {
    if (source.kind !== "pasted_text") {
      if (!source.storage_path) throw new Error("download_failed");
      const { data: storedFile, error: downloadError } = await supabase.storage.from("sources").download(source.storage_path);
      if (downloadError || !storedFile) throw new Error("download_failed");
      const bytes = new Uint8Array(await storedFile.arrayBuffer());
      const kind = identifyFile(`source.${source.kind}`, bytes);
      const extracted = await extractFile(kind, bytes);
      const { error: saveError } = await supabase.from("sources").update({ extracted_text: extracted.text, extracted_characters: extracted.text.length, page_count: extracted.pageCount }).eq("id", sourceId).eq("owner_id", ownerId);
      if (saveError) throw saveError;
    }
    const { data: job } = await supabase.from("ingestion_jobs").select("id").eq("source_id", sourceId).eq("owner_id", ownerId).eq("stage", "queued").single();
    const ingestionJob = { id: job!.id, sourceId, notebookId, ownerId };
    const prepared = await prepareIngestion(new SupabaseIngestionRepository(supabase), ingestionJob);
    if (prepared.status !== "prepared") {
      if (prepared.status === "failed" && source.storage_path) {
        await supabase.storage.from("sources").remove([source.storage_path]);
        await supabase.from("sources").update({ storage_path: null }).eq("id", sourceId).eq("owner_id", ownerId);
      }
      return prepared.status === "failed" ? { status: "error" as const, code: prepared.code } : { status: "error" as const, code: "already_processing" };
    }
    const completed = await completeIngestion(new SupabaseIngestionRepository(supabase), ingestionJob);
    if (completed.status === "failed" && source.storage_path) {
      const { data: failedSource } = await supabase.from("sources").select("status").eq("id", sourceId).eq("owner_id", ownerId).maybeSingle();
      if (failedSource?.status === "permanent_error") {
        await supabase.storage.from("sources").remove([source.storage_path]);
        await supabase.from("sources").update({ storage_path: null }).eq("id", sourceId).eq("owner_id", ownerId);
      }
    }
    revalidatePath(`/notebooks/${notebookId}`);
    return completed.status === "failed" ? { status: "error" as const, code: completed.code } : { status: "ready" as const };
  } catch (error) {
    const code = error instanceof FileIngestionError ? error.code : "file_ingestion_failed";
    await Promise.all([
      supabase.from("ingestion_jobs").update({ stage: "failed", completed_at: new Date().toISOString(), error_code: code }).eq("source_id", sourceId).eq("owner_id", ownerId),
      supabase.from("sources").update({ status: "permanent_error", error_code: code, storage_path: null }).eq("id", sourceId).eq("owner_id", ownerId),
      source.storage_path ? supabase.storage.from("sources").remove([source.storage_path]) : Promise.resolve(),
    ]);
    revalidatePath(`/notebooks/${notebookId}`);
    return { status: "error" as const, code };
  }
}

export async function processUploadedFile(notebookId: string, sourceId: string) {
  return processSource(notebookId, sourceId);
}

export async function cancelReservedFile(notebookId: string, sourceId: string) {
  const supabase = await createClient();
  const { data: source } = await supabase.from("sources").select("storage_path").eq("id", sourceId).eq("notebook_id", notebookId).eq("status", "pending").maybeSingle();
  if (source?.storage_path) await supabase.storage.from("sources").remove([source.storage_path]);
  await supabase.from("sources").delete().eq("id", sourceId).eq("notebook_id", notebookId).eq("status", "pending");
}

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

  const contentHash = createHash("sha256").update(content).digest("hex");
  const { data, error } = await supabase.rpc("reserve_ingestion_source", {
    p_notebook_id: notebookId, p_kind: "pasted_text", p_title: title, p_content_hash: contentHash,
    p_extracted_text: content, p_daily_limit: getDailyIngestionLimit(),
  });
  if (error) fail("save_failed");
  const reservation = asRpcResult(data);
  if (reservation.status === "duplicate") redirect(`/notebooks/${notebookId}?lang=${locale}`);
  if (reservation.status === "error") fail(reservation.code);
  if (reservation.status === "reserved") {
    const result = await processSource(notebookId, reservation.sourceId);
    if (result.status === "error") fail(result.code);
  } else fail("save_failed");

  revalidatePath(`/notebooks/${notebookId}`);
  redirect(`/notebooks/${notebookId}?lang=${locale}`);
}

export async function retrySource(notebookId: string, sourceId: string, formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const ownerId = claimsData?.claims?.sub;
  if (!ownerId) redirect("/login");
  const { data, error } = await supabase.rpc("requeue_source_ingestion", { p_source_id: sourceId, p_notebook_id: notebookId, p_daily_limit: getDailyIngestionLimit() });
  if (error) redirect(`/notebooks/${notebookId}?lang=${locale}&error=retry_failed`);
  const queued = asRpcResult(data);
  if (queued.status === "error") redirect(`/notebooks/${notebookId}?lang=${locale}&error=${queued.code}`);
  const result = await processSource(notebookId, sourceId);
  revalidatePath(`/notebooks/${notebookId}`);
  redirect(`/notebooks/${notebookId}?lang=${locale}${result.status === "error" ? `&error=${result.code}` : ""}`);
}

export async function removeSource(notebookId: string, sourceId: string, formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const ownerId = claimsData?.claims?.sub;
  if (!ownerId) redirect("/login");
  const { data: source } = await supabase.from("sources").select("storage_path,status").eq("id", sourceId).eq("notebook_id", notebookId).eq("owner_id", ownerId).maybeSingle();
  if (!source) redirect(`/notebooks/${notebookId}?lang=${locale}&error=source_not_found`);
  if (source.status === "processing") redirect(`/notebooks/${notebookId}?lang=${locale}&error=source_busy`);
  if (source.storage_path) {
    const { error: storageError } = await supabase.storage.from("sources").remove([source.storage_path]);
    if (storageError) redirect(`/notebooks/${notebookId}?lang=${locale}&error=delete_failed`);
  }
  const { error: deleteError } = await supabase.from("sources").delete().eq("id", sourceId).eq("notebook_id", notebookId).eq("owner_id", ownerId);
  if (deleteError) redirect(`/notebooks/${notebookId}?lang=${locale}&error=delete_failed`);
  revalidatePath(`/notebooks/${notebookId}`);
  redirect(`/notebooks/${notebookId}?lang=${locale}`);
}
