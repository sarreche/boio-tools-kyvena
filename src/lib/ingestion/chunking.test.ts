import { describe, expect, it } from "vitest";
import { estimateTokens, prepareChunks } from "./chunking";
import { normalizePastedText } from "./limits";

describe("normalizePastedText", () => {
  it("normalizes whitespace without joining paragraphs", () => {
    expect(normalizePastedText("  Uno  \r\n\r\n\r\nDos\t \r\n")).toBe("Uno\n\nDos");
  });
});

describe("prepareChunks", () => {
  it("keeps short structural units together", () => {
    const chunks = prepareChunks("# Título\n\nPrimer párrafo.\n\nSegundo párrafo.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].location).toEqual({ section: "Título" });
  });
  it("splits oversized content with bounded chunks and stable ordinals", () => {
    const chunks = prepareChunks(Array.from({ length: 900 }, (_, index) => `palabra${index}`).join(" "));
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every(chunk => estimateTokens(chunk.content) <= 460)).toBe(true);
    expect(chunks.map(chunk => chunk.ordinal)).toEqual(chunks.map((_, index) => index));
  });
});

describe("file locations", () => {
  it("keeps PDF page boundaries in chunk metadata", () => {
    const chunks = prepareChunks("Primera página con evidencia.\n\f\nSegunda página con otra evidencia.");
    expect(chunks.map(chunk => chunk.location.page)).toEqual([1, 2]);
  });
  it("rejects sources that exceed the chunk limit", () => {
    const content = Array.from({ length: 151 }, (_, index) => `${index} ${"x".repeat(1600)}`).join("\n\n");
    expect(() => prepareChunks(content)).toThrowError(expect.objectContaining({ code: "too_many_chunks" }));
  });
});
