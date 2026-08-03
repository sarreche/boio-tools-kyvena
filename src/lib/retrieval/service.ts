import { embedQuery } from "../ingestion/openrouter-embeddings";
import { RETRIEVAL_LIMITS } from "./limits";

export type RetrievalCandidate = {
  chunkId: number;
  sourceId: string;
  sourceTitle: string;
  ordinal: number;
  content: string;
  location: unknown;
  tokenCount: number;
  semanticRank: number | null;
  lexicalRank: number | null;
  semanticScore: number | null;
  lexicalScore: number | null;
  rrfScore: number;
};

export interface RetrievalRepository {
  hybridSearch(input: {
    notebookId: string;
    sourceIds: string[];
    query: string;
    queryEmbedding: number[];
  }): Promise<RetrievalCandidate[]>;
}

export class RetrievalInputError extends Error {
  constructor(public readonly code: "invalid_query" | "invalid_retrieval_scope") { super(code); }
}

export async function retrieveContext(repository: RetrievalRepository, input: {
  notebookId: string;
  sourceIds: string[];
  query: string;
}) {
  const query = input.query.trim();
  if (!query || query.length > RETRIEVAL_LIMITS.maxQuestionCharacters) throw new RetrievalInputError("invalid_query");
  const sourceIds = [...new Set(input.sourceIds)];
  if (!input.notebookId || sourceIds.length < 1 || sourceIds.length > 20) throw new RetrievalInputError("invalid_retrieval_scope");

  const embedded = await embedQuery(query);
  const ranked = await repository.hybridSearch({ ...input, query, sourceIds, queryEmbedding: embedded.vector });
  return {
    chunks: selectContext(ranked),
    embeddingModel: embedded.effectiveModel,
  };
}

export function selectContext(ranked: RetrievalCandidate[]) {
  const selected: RetrievalCandidate[] = [];
  const selectedIds = new Set<number>();
  const perSource = new Map<string, number>();
  let tokens = 0;

  const add = (candidate: RetrievalCandidate, enforceSourceLimit: boolean) => {
    if (selectedIds.has(candidate.chunkId) || candidate.tokenCount <= 0) return;
    if (enforceSourceLimit && (perSource.get(candidate.sourceId) ?? 0) >= RETRIEVAL_LIMITS.maxChunksPerSource) return;
    if (tokens + candidate.tokenCount > RETRIEVAL_LIMITS.maxContextTokens) return;
    selected.push(candidate);
    selectedIds.add(candidate.chunkId);
    perSource.set(candidate.sourceId, (perSource.get(candidate.sourceId) ?? 0) + 1);
    tokens += candidate.tokenCount;
  };

  for (const candidate of ranked) {
    if (selected.length >= RETRIEVAL_LIMITS.maxContextChunks) break;
    add(candidate, true);
  }
  // The approved limit allows exceeding four chunks only when alternatives do not
  // exist; the second pass fills remaining capacity without displacing diversity.
  for (const candidate of ranked) {
    if (selected.length >= RETRIEVAL_LIMITS.maxContextChunks) break;
    add(candidate, false);
  }
  return selected;
}
