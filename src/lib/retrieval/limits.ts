export const RETRIEVAL_LIMITS = {
  maxQuestionCharacters: 4_000,
  semanticCandidates: 20,
  lexicalCandidates: 20,
  maxContextChunks: 10,
  maxChunksPerSource: 4,
  maxContextTokens: 6_000,
  rrfK: 60,
} as const;
