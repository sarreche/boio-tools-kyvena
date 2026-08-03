import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import { RETRIEVAL_LIMITS } from "./limits";
import type { RetrievalCandidate, RetrievalRepository } from "./service";

export class SupabaseRetrievalRepository implements RetrievalRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async hybridSearch(input: { notebookId: string; sourceIds: string[]; query: string; queryEmbedding: number[] }) {
    const { data, error } = await this.client.rpc("hybrid_search_chunks", {
      p_notebook_id: input.notebookId,
      p_source_ids: input.sourceIds,
      p_query_text: input.query,
      p_query_embedding: `[${input.queryEmbedding.join(",")}]`,
      p_semantic_limit: RETRIEVAL_LIMITS.semanticCandidates,
      p_lexical_limit: RETRIEVAL_LIMITS.lexicalCandidates,
      p_rrf_k: RETRIEVAL_LIMITS.rrfK,
    });
    if (error) throw error;
    return (data ?? []).map((row): RetrievalCandidate => ({
      chunkId: row.chunk_id,
      sourceId: row.source_id,
      sourceTitle: row.source_title,
      ordinal: row.ordinal,
      content: row.content,
      location: row.location as Json,
      tokenCount: row.token_count,
      semanticRank: row.semantic_rank,
      lexicalRank: row.lexical_rank,
      semanticScore: row.semantic_score,
      lexicalScore: row.lexical_score,
      rrfScore: row.rrf_score,
    }));
  }
}
