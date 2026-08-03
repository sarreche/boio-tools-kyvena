import { INGESTION_LIMITS } from "./limits";

export type ApprovedFileKind = "txt" | "md" | "pdf";
export type ExtractedFile = { text: string; pageCount: number | null };

export class FileIngestionError extends Error {
  constructor(public readonly code: "file_too_large" | "file_name_too_long" | "unsupported_file_type" | "invalid_file_content" | "too_many_pages" | "content_too_long" | "pdf_text_required") {
    super(code);
  }
}

const extensionKinds: Record<string, ApprovedFileKind> = { txt: "txt", md: "md", pdf: "pdf" };

export function identifyFile(name: string, bytes: Uint8Array): ApprovedFileKind {
  if (!name || name.length > INGESTION_LIMITS.maxFileNameCharacters) throw new FileIngestionError("file_name_too_long");
  if (bytes.byteLength === 0) throw new FileIngestionError("invalid_file_content");
  if (bytes.byteLength > INGESTION_LIMITS.maxFileBytes) throw new FileIngestionError("file_too_large");
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  const kind = extensionKinds[extension];
  if (!kind) throw new FileIngestionError("unsupported_file_type");
  const isPdf = new TextDecoder("ascii").decode(bytes.subarray(0, 5)) === "%PDF-";
  if ((kind === "pdf") !== isPdf) throw new FileIngestionError("invalid_file_content");
  return kind;
}

function validateExtractedText(text: string) {
  const normalized = text.replace(/\r\n?/g, "\n").replace(/[\t\v]+/g, " ").replace(/[ ]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
  if (!normalized) throw new FileIngestionError("invalid_file_content");
  if (normalized.length > INGESTION_LIMITS.maxExtractedCharacters) throw new FileIngestionError("content_too_long");
  return normalized;
}

function extractUtf8(bytes: Uint8Array) {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (text.includes("\0")) throw new FileIngestionError("invalid_file_content");
    return validateExtractedText(text);
  } catch (error) {
    if (error instanceof FileIngestionError) throw error;
    throw new FileIngestionError("invalid_file_content");
  }
}

export async function extractFile(kind: ApprovedFileKind, bytes: Uint8Array): Promise<ExtractedFile> {
  if (kind !== "pdf") return { text: extractUtf8(bytes), pageCount: null };

  try {
    const { getDocument, VerbosityLevel } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const document = await getDocument({ data: bytes, useWorkerFetch: false, verbosity: VerbosityLevel.ERRORS }).promise;
    if (document.numPages > INGESTION_LIMITS.maxPdfPages) throw new FileIngestionError("too_many_pages");
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items.map(item => "str" in item ? item.str : "").join(" ").replace(/\s+/g, " ").trim();
      pages.push(text);
      page.cleanup();
    }
    await document.cleanup();
    if (!pages.some(Boolean)) throw new FileIngestionError("pdf_text_required");
    return { text: validateExtractedText(pages.join("\n\f\n")), pageCount: pages.length };
  } catch (error) {
    if (error instanceof FileIngestionError) throw error;
    throw new FileIngestionError("invalid_file_content");
  }
}
