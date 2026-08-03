import { INGESTION_LIMITS } from "./limits";

export const EMBEDDING_MODEL = "nvidia/nemotron-3-embed-1b:free";
export const EMBEDDING_PROVIDER = "openrouter";
export const EMBEDDING_DIMENSIONS = 2048;

export class EmbeddingProviderError extends Error {
  constructor(public readonly code: string, public readonly retryable: boolean) { super(code); }
}

type EmbeddingResponse = { model?: string; data?: Array<{ index: number; embedding: number[] }> };

export async function embedPassages(passages: string[]) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new EmbeddingProviderError("embedding_configuration_error", false);
  const vectors: number[][] = [];
  let effectiveModel = EMBEDDING_MODEL;
  for (let offset = 0; offset < passages.length; offset += 32) {
    const input = passages.slice(offset, offset + 32).map(text => `passage: ${text}`);
    const response = await requestBatch(apiKey, input);
    effectiveModel = response.model ?? effectiveModel;
    const ordered = [...(response.data ?? [])].sort((a, b) => a.index - b.index);
    if (ordered.length !== input.length) throw new EmbeddingProviderError("invalid_embedding_response", true);
    for (const item of ordered) {
      if (item.embedding.length !== EMBEDDING_DIMENSIONS || item.embedding.some(value => !Number.isFinite(value))) {
        throw new EmbeddingProviderError("invalid_embedding_dimensions", true);
      }
      vectors.push(item.embedding);
    }
  }
  return { vectors, effectiveModel };
}

async function requestBatch(apiKey: string, input: string[]): Promise<EmbeddingResponse> {
  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response;
    try {
      response = await fetch("https://openrouter.ai/api/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: EMBEDDING_MODEL, input, encoding_format: "float" }),
        signal: AbortSignal.timeout(INGESTION_LIMITS.providerTimeoutMs),
      });
    } catch {
      if (attempt === 0) continue;
      throw new EmbeddingProviderError("embedding_network_error", true);
    }
    if (response.ok) return response.json() as Promise<EmbeddingResponse>;
    const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
    if (retryable && attempt === 0) continue;
    throw new EmbeddingProviderError(`embedding_http_${response.status}`, retryable);
  }
  throw new EmbeddingProviderError("embedding_unavailable", true);
}
