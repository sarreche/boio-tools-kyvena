import { INGESTION_LIMITS } from "./limits";

export type PreparedChunk = { ordinal: number; content: string; tokenCount: number; location: { section?: string; page?: number } };

export class IngestionLimitError extends Error {
  constructor(public readonly code: "too_many_chunks" | "empty_content") { super(code); }
}

export function estimateTokens(text: string) { return Math.max(1, Math.ceil(text.length / 4)); }

function splitOversizedUnit(unit: string, maxCharacters: number) {
  const pieces: string[] = [];
  let remaining = unit;
  while (remaining.length > maxCharacters) {
    let boundary = remaining.lastIndexOf(" ", maxCharacters);
    if (boundary < Math.floor(maxCharacters * 0.6)) boundary = maxCharacters;
    pieces.push(remaining.slice(0, boundary).trim());
    remaining = remaining.slice(boundary).trim();
  }
  if (remaining) pieces.push(remaining);
  return pieces;
}

export function prepareChunks(content: string): PreparedChunk[] {
  const normalized = content.trim();
  if (!normalized) throw new IngestionLimitError("empty_content");
  const maxCharacters = INGESTION_LIMITS.targetChunkTokens * 4;
  const overlapCharacters = INGESTION_LIMITS.chunkOverlapTokens * 4;
  const chunks: Array<{ content: string; section?: string; page?: number }> = [];
  const pages = normalized.split(/\n?\f\n?/);
  let section: string | undefined;
  pages.forEach((pageContent, pageIndex) => {
    const units = pageContent.split(/\n{2,}/).flatMap(unit => splitOversizedUnit(unit, maxCharacters)).filter(Boolean);
    let current = "";
    for (const unit of units) {
      if (/^#{1,6}\s+\S/.test(unit)) section = unit.split("\n", 1)[0].replace(/^#{1,6}\s+/, "");
      const candidate = current ? `${current}\n\n${unit}` : unit;
      if (candidate.length <= maxCharacters) { current = candidate; continue; }
      if (current) chunks.push({ content: current, section, page: pages.length > 1 ? pageIndex + 1 : undefined });
      const overlap = current.slice(-overlapCharacters).replace(/^\S*\s/, "").trim();
      current = overlap ? `${overlap}\n\n${unit}` : unit;
    }
    if (current) chunks.push({ content: current, section, page: pages.length > 1 ? pageIndex + 1 : undefined });
  });
  if (chunks.length > INGESTION_LIMITS.maxChunksPerSource) throw new IngestionLimitError("too_many_chunks");
  return chunks.map((chunk, ordinal) => ({ ordinal, content: chunk.content, tokenCount: estimateTokens(chunk.content), location: { ...(chunk.section ? { section: chunk.section } : {}), ...(chunk.page ? { page: chunk.page } : {}) } }));
}
