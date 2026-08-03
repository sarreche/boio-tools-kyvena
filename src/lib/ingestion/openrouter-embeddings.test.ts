import { afterEach, describe, expect, it, vi } from "vitest";
import { EMBEDDING_DIMENSIONS, EmbeddingProviderError, embedPassages, embedQuery } from "./openrouter-embeddings";

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
  it("retries one transient provider failure", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    const vector = Array(EMBEDDING_DIMENSIONS).fill(0);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ index: 0, embedding: vector }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(embedPassages(["texto"])).resolves.toMatchObject({ vectors: [vector] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("does not retry credential failures", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(new Response("unauthorized", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(embedPassages(["texto"])).rejects.toEqual(expect.objectContaining<Partial<EmbeddingProviderError>>({ code: "embedding_http_401", retryable: false }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("embedQuery", () => {
  it("uses the query prefix and returns the effective model", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    const vector = Array(EMBEDDING_DIMENSIONS).fill(0);
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ model: "effective-model", data: [{ index: 0, embedding: vector }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(embedQuery("búsqueda híbrida")).resolves.toEqual({ vector, effectiveModel: "effective-model" });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string).input).toEqual(["query: búsqueda híbrida"]);
  });
});
