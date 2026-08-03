import { afterEach, describe, expect, it, vi } from "vitest";
import { EMBEDDING_DIMENSIONS, embedPassages } from "./openrouter-embeddings";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("embedPassages", () => {
  it("prefixes passages, restores index order and validates dimensions", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    const vector = Array(EMBEDDING_DIMENSIONS).fill(0).map((_, index) => index === 0 ? 1 : 0);
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ model: "effective-model", data: [{ index: 1, embedding: vector }, { index: 0, embedding: vector }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await embedPassages(["uno", "dos"]);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.input).toEqual(["passage: uno", "passage: dos"]);
    expect(result.vectors).toHaveLength(2);
    expect(result.effectiveModel).toBe("effective-model");
  });
});
