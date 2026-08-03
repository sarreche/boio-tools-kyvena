import { describe, expect, it } from "vitest";
import { INGESTION_LIMITS } from "./limits";
import { extractFile, FileIngestionError, identifyFile } from "./file-extraction";

const encode = (value: string) => new TextEncoder().encode(value);

function pdfWithPages(pageCount: number, text = "Evidence from PDF") {
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  const fontId = 3 + pageCount;
  const contentStart = fontId + 1;
  const pageIds = Array.from({ length: pageCount }, (_, index) => index + 3);
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pageCount} >>`];
  pageIds.forEach((_, index) => objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentStart + index} 0 R >>`));
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  pageIds.forEach(() => objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`));
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return encode(pdf);
}

describe("file ingestion validation", () => {
  it("accepts UTF-8 TXT and Markdown using their extension and content", async () => {
    const bytes = encode("# Título\n\nContenido verificable.");
    expect(identifyFile("nota.md", bytes)).toBe("md");
    await expect(extractFile("md", bytes)).resolves.toEqual({ text: "# Título\n\nContenido verificable.", pageCount: null });
  });

  it("rejects a PDF extension without a PDF signature", () => {
    expect(() => identifyFile("falso.pdf", encode("contenido de texto"))).toThrowError(FileIngestionError);
  });

  it("rejects binary or non-UTF-8 text", async () => {
    await expect(extractFile("txt", new Uint8Array([0xff, 0xfe, 0x00]))).rejects.toMatchObject({ code: "invalid_file_content" });
  });

  it("extracts selectable PDF text and records its page", async () => {
    const bytes = pdfWithPages(1);
    expect(identifyFile("evidence.pdf", bytes)).toBe("pdf");
    await expect(extractFile("pdf", bytes)).resolves.toEqual({ text: "Evidence from PDF", pageCount: 1 });
  });

  it("enforces file size, name, extracted text, and PDF page limits", async () => {
    expect(() => identifyFile(`${"a".repeat(151)}.txt`, encode("text"))).toThrowError(expect.objectContaining({ code: "file_name_too_long" }));
    expect(() => identifyFile("large.txt", new Uint8Array(INGESTION_LIMITS.maxFileBytes + 1))).toThrowError(expect.objectContaining({ code: "file_too_large" }));
    await expect(extractFile("txt", encode("a".repeat(INGESTION_LIMITS.maxExtractedCharacters + 1)))).rejects.toMatchObject({ code: "content_too_long" });
    await expect(extractFile("pdf", pdfWithPages(INGESTION_LIMITS.maxPdfPages + 1))).rejects.toMatchObject({ code: "too_many_pages" });
  });
});
