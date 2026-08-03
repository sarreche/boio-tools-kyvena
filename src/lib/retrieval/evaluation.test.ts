import { describe, expect, it } from "vitest";
import { recallAtK, reciprocalRank, summarizeRetrieval } from "./evaluation";

describe("retrieval evaluation", () => {
  const cases = [
    { id: "direct", expectedChunkIds: [2], retrievedChunkIds: [2, 8, 9] },
    { id: "combined", expectedChunkIds: [4, 5], retrievedChunkIds: [9, 4, 7, 5] },
    { id: "miss", expectedChunkIds: [12], retrievedChunkIds: [1, 2, 3] },
  ];
  it("calculates recall@k and reciprocal rank deterministically", () => {
    expect(recallAtK(cases[1], 3)).toBe(0.5);
    expect(reciprocalRank(cases[1], 10)).toBe(0.5);
  });
  it("summarizes a versioned set without conflating generation quality", () => {
    expect(summarizeRetrieval(cases, 10)).toEqual({ cases: 3, recallAtK: 2 / 3, mrr: 0.5 });
  });
});
