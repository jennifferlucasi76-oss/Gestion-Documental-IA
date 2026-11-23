import crypto from "node:crypto";

export const ALLOWED_EXTENSIONS = ["pdf", "docx"] as const;
export type AllowedFileType = (typeof ALLOWED_EXTENSIONS)[number];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES: Record<AllowedFileType, string[]> = {
  pdf: ["application/pdf"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
  ],
};

/**
 * Calcula el hash criptográfico SHA-256 de un archivo para garantizar su integridad.
 */
export function computeSha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Valida extensión, tipo MIME y tamaño máximo permitido antes de ingerir el archivo.
 */
export function validateUploadedFile(file: {
  name: string;
  size: number;
  type: string;
}): { ok: true; fileType: AllowedFileType } | { ok: false; error: string } {
  if (file.size <= 0) {
    return { ok: false, error: "El archivo está vacío." };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      error: "El archivo supera el tamaño máximo permitido (10 MB).",
    };
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext !== "pdf" && ext !== "docx") {
    return {
      ok: false,
      error: "Formato no permitido. Solo se aceptan archivos .pdf y .docx.",
    };
  }

  if (file.type && !ALLOWED_MIME_TYPES[ext].includes(file.type)) {
    return {
      ok: false,
      error: `El tipo MIME (${file.type}) no corresponde a un archivo .${ext} válido.`,
    };
  }

  return { ok: true, fileType: ext };
}

/**
 * Sanitiza nombres de archivo para almacenamiento seguro en Supabase Storage.
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_");
}

