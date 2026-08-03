export type RetrievalEvaluationCase = {
  id: string;
  expectedChunkIds: number[];
  retrievedChunkIds: number[];
};

export function recallAtK(item: RetrievalEvaluationCase, k: number) {
  if (item.expectedChunkIds.length === 0) return 1;
  const retrieved = new Set(item.retrievedChunkIds.slice(0, k));
  return item.expectedChunkIds.filter(id => retrieved.has(id)).length / item.expectedChunkIds.length;
}

export function reciprocalRank(item: RetrievalEvaluationCase, k: number) {
  const expected = new Set(item.expectedChunkIds);
  const index = item.retrievedChunkIds.slice(0, k).findIndex(id => expected.has(id));
  return index < 0 ? 0 : 1 / (index + 1);
}

export function summarizeRetrieval(cases: RetrievalEvaluationCase[], k = 10) {
  if (cases.length === 0) return { cases: 0, recallAtK: 0, mrr: 0 };
  const sum = cases.reduce((result, item) => ({
    recall: result.recall + recallAtK(item, k),
    reciprocalRank: result.reciprocalRank + reciprocalRank(item, k),
  }), { recall: 0, reciprocalRank: 0 });
  return { cases: cases.length, recallAtK: sum.recall / cases.length, mrr: sum.reciprocalRank / cases.length };
}
