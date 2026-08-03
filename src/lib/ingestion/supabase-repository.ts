import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { IngestionJob, IngestionRepository } from "./service";
import type { PreparedChunk } from "./chunking";
import { EMBEDDING_MODEL, EMBEDDING_PROVIDER } from "./openrouter-embeddings";

export class SupabaseIngestionRepository implements IngestionRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}
  async claimQueuedJob(job: IngestionJob) {
    const { data, error } = await this.client.from("ingestion_jobs").update({ stage: "extracting", started_at: new Date().toISOString() }).eq("id", job.id).eq("source_id", job.sourceId).eq("owner_id", job.ownerId).eq("notebook_id", job.notebookId).eq("stage", "queued").select("id").maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }
  async getOwnedSource(job: IngestionJob) {
    const { data, error } = await this.client.from("sources").select("id,extracted_text").eq("id", job.sourceId).eq("owner_id", job.ownerId).eq("notebook_id", job.notebookId).maybeSingle();
    if (error) throw error;
    return data ? { id: data.id, extractedText: data.extracted_text } : null;
  }
  async markSourceProcessing(sourceId: string, ownerId: string) {
    const { error } = await this.client.from("sources").update({ status: "processing", error_code: null, error_detail: null }).eq("id", sourceId).eq("owner_id", ownerId);
    if (error) throw error;
  }
  async markReadyForEmbedding(jobId: string, ownerId: string) {
    const { error } = await this.client.from("ingestion_jobs").update({ stage: "embedding" }).eq("id", jobId).eq("owner_id", ownerId);
    if (error) throw error;
  }
  async markFailed(job: IngestionJob, code: string, retryable: boolean) {
    await Promise.all([
      this.client.from("ingestion_jobs").update({ stage: "failed", completed_at: new Date().toISOString(), error_code: code }).eq("id", job.id).eq("owner_id", job.ownerId),
      this.client.from("sources").update({ status: retryable ? "retryable_error" : "permanent_error", error_code: code }).eq("id", job.sourceId).eq("owner_id", job.ownerId),
    ]);
  }
  async finalize(job: IngestionJob, chunks: PreparedChunk[], vectors: number[][], effectiveModel: string) {
    const payload = chunks.map((chunk, index) => ({ ...chunk, embedding: vectors[index] }));
    const { error } = await this.client.rpc("finalize_source_ingestion", {
      p_job_id: job.id, p_source_id: job.sourceId, p_notebook_id: job.notebookId, p_chunks: payload,
      p_embedding_provider: EMBEDDING_PROVIDER, p_embedding_model: effectiveModel || EMBEDDING_MODEL, p_pipeline_version: "pasted-text-v1",
    });
    if (error) throw error;
  }
}
