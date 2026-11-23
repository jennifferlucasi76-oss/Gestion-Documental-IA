import mammoth from "mammoth";
import { extractText } from "unpdf";
import type { AllowedFileType } from "./security";

/**
 * Normaliza espacios y elimina caracteres de control no imprimibles para indexación PLN.
 */
export function cleanDocumentText(rawText: string): string {
  return rawText
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extrae el texto de un archivo .pdf o .docx desde su Buffer en memoria.
 */
export async function extractDocumentText(
  buffer: Buffer,
  fileType: AllowedFileType
): Promise<{ text: string; pages?: number }> {
  if (fileType === "pdf") {
    const result = await extractText(new Uint8Array(buffer), {
      mergePages: true,
    });
    return {
      text: cleanDocumentText(result.text),
      pages: result.totalPages,
    };
  }

  const result = await mammoth.extractRawText({ buffer });
  return {
    text: cleanDocumentText(result.value),
  };
}

/**
 * Divide un documento extenso en fragmentos (chunks) con solapamiento para embeddings.
 */
export function splitIntoChunks(
  text: string,
  maxChunkChars = 1800,
  overlapChars = 200
): string[] {
  if (!text) return [];
  if (text.length <= maxChunkChars) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + maxChunkChars, text.length);

    if (end < text.length) {
      const lastSpace = text.lastIndexOf(" ", end);
      if (lastSpace > start + maxChunkChars * 0.5) {
        end = lastSpace;
      }
    }

    const slice = text.slice(start, end).trim();
    if (slice.length > 0) {
      chunks.push(slice);
    }

    if (end >= text.length) break;
    start = Math.max(end - overlapChars, start + 1);
  }

  return chunks;
}

