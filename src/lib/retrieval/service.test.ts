import { describe, expect, it } from "vitest";
import { RETRIEVAL_LIMITS } from "./limits";
import { selectContext, type RetrievalCandidate } from "./service";

const candidate = (chunkId: number, sourceId: string, tokenCount = 100): RetrievalCandidate => ({
  chunkId, sourceId, sourceTitle: sourceId, ordinal: chunkId, content: `chunk ${chunkId}`,
  location: {}, tokenCount, semanticRank: chunkId, lexicalRank: null,
  semanticScore: 1 / chunkId, lexicalScore: null, rrfScore: 1 / (60 + chunkId),
});

describe("selectContext", () => {
  it("enforces final count, source diversity and token budget", () => {
    const ranked = [
      ...Array.from({ length: 7 }, (_, index) => candidate(index + 1, "source-a", 700)),
      ...Array.from({ length: 6 }, (_, index) => candidate(index + 8, `source-${index + 1}`, 700)),
    ];
    const result = selectContext(ranked);
    expect(result).toHaveLength(8);
    expect(result.reduce((sum, item) => sum + item.tokenCount, 0)).toBeLessThanOrEqual(RETRIEVAL_LIMITS.maxContextTokens);
    expect(result.filter(item => item.sourceId === "source-a")).toHaveLength(4);
  });

  it("uses extra chunks from one source only when alternatives are exhausted", () => {
    const result = selectContext(Array.from({ length: 10 }, (_, index) => candidate(index + 1, "only-source")));
    expect(result).toHaveLength(RETRIEVAL_LIMITS.maxContextChunks);
  });
});
