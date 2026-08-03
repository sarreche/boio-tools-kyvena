import { IngestionLimitError, prepareChunks, type PreparedChunk } from "./chunking";
import { EmbeddingProviderError, embedPassages } from "./openrouter-embeddings";

export type IngestionJob = { id: string; sourceId: string; ownerId: string; notebookId: string };
export type IngestionSource = { id: string; extractedText: string | null };
export interface IngestionRepository {
  claimQueuedJob(input: IngestionJob): Promise<boolean>;
  getOwnedSource(input: IngestionJob): Promise<IngestionSource | null>;
  markSourceProcessing(sourceId: string, ownerId: string): Promise<void>;
  markReadyForEmbedding(jobId: string, ownerId: string): Promise<void>;
  markFailed(input: IngestionJob, code: string, retryable: boolean): Promise<void>;
  finalize(input: IngestionJob, chunks: PreparedChunk[], vectors: number[][], effectiveModel: string): Promise<void>;
}

export async function completeIngestion(repository: IngestionRepository, job: IngestionJob): Promise<PrepareResult> {
  try {
    const source = await repository.getOwnedSource(job);
    if (!source?.extractedText) throw new IngestionLimitError("empty_content");
    const chunks = prepareChunks(source.extractedText);
    const embedded = await embedPassages(chunks.map(chunk => chunk.content));
    await repository.finalize(job, chunks, embedded.vectors, embedded.effectiveModel);
    return { status: "prepared", chunks };
  } catch (error) {
    const code = error instanceof IngestionLimitError || error instanceof EmbeddingProviderError ? error.code : "ingestion_failed";
    const retryable = error instanceof EmbeddingProviderError && error.retryable;
    await repository.markFailed(job, code, retryable);
    return { status: "failed", code };
  }
}
export type PrepareResult = { status: "prepared"; chunks: PreparedChunk[] } | { status: "already_claimed" } | { status: "failed"; code: string };

export async function prepareIngestion(repository: IngestionRepository, job: IngestionJob): Promise<PrepareResult> {
  if (!(await repository.claimQueuedJob(job))) return { status: "already_claimed" };
  try {
    const source = await repository.getOwnedSource(job);
    if (!source?.extractedText) throw new IngestionLimitError("empty_content");
    await repository.markSourceProcessing(source.id, job.ownerId);
    const chunks = prepareChunks(source.extractedText);
    await repository.markReadyForEmbedding(job.id, job.ownerId);
    return { status: "prepared", chunks };
  } catch (error) {
    const code = error instanceof IngestionLimitError ? error.code : "preparation_failed";
    await repository.markFailed(job, code, false);
    return { status: "failed", code };
  }
}
