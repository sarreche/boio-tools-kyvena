export const INGESTION_LIMITS = Object.freeze({
  maxFileBytes: 5 * 1024 * 1024,
  maxFilesPerSelection: 3,
  maxConcurrentPerUser: 1,
  maxSourcesPerNotebook: 20,
  maxPdfPages: 75,
  maxExtractedCharacters: 250_000,
  maxPastedTextCharacters: 100_000,
  maxChunksPerSource: 150,
  maxFileNameCharacters: 150,
  targetChunkTokens: 400,
  chunkOverlapTokens: 60,
  minimumUsefulChunkTokens: 80,
  embeddingBatchSize: 32,
  providerTimeoutMs: 15_000,
  targetDurationMs: 45_000,
});

export function normalizePastedText(value: string) {
  return value.replace(/\r\n?/g, "\n").replace(/[\t\f\v]+/g, " ").replace(/[ ]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
}
