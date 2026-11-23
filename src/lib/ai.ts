import "server-only";

const OPENAI_BASE_URL = "https://api.openai.com/v1";
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 768;
const CHAT_MODEL = "gpt-4o-mini";

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

function getOpenAiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      "Falta configurar OPENAI_API_KEY en las variables de entorno del servidor."
    );
  }
  return key;
}

/**
 * Convierte uno o varios textos en vectores de 768 dimensiones compatibles con pgvector.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const apiKey = getOpenAiKey();

  const batchSize = 32;
  const allVectors: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const response = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: batch,
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      throw new Error(
        `Error generando embeddings en OpenAI (${response.status}): ${errBody.slice(0, 200)}`
      );
    }

    const payload = (await response.json()) as {
      data?: Array<{ index: number; embedding: number[] }>;
    };

    if (!payload.data || payload.data.length !== batch.length) {
      throw new Error("Respuesta inesperada del servicio de embeddings.");
    }

    const sorted = [...payload.data].sort((a, b) => a.index - b.index);
    for (const item of sorted) {
      allVectors.push(item.embedding);
    }
  }

  return allVectors;
}

/**
 * Formatea un vector numérico al literal de texto que espera pgvector en PostgreSQL.
 */
export function toPgVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export interface DocumentTypeOption {
  id: string;
  name: string;
  description: string | null;
  default_access_level: "publico" | "interno" | "confidencial";
}

export interface ExtractedEntity {
  text: string;
  type: string;
}

export interface DocumentAiAnalysis {
  documentTypeId: string | null;
  documentTypeName: string;
  defaultAccessLevel: "publico" | "interno" | "confidencial";
  confidenceScore: number;
  classificationReason: string;
  suggestedTitle: string;
  emissionDate: string | null;
  author: string | null;
  originDepartment: string | null;
  topic: string | null;
  keywords: string[];
  entities: ExtractedEntity[];
  summary: string | null;
}

function sanitizeIsoDate(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const parsed = new Date(`${trimmed}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : trimmed;
}

function normalizeLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Clasifica automáticamente el documento y extrae metadatos mediante PLN con OpenAI.
 */
export async function analyzeDocumentWithAI(params: {
  fileName: string;
  text: string;
  documentTypes: DocumentTypeOption[];
}): Promise<DocumentAiAnalysis> {
  const apiKey = getOpenAiKey();
  const excerpt = params.text.slice(0, 12000);
  const catalogDescription = params.documentTypes
    .map(
      (dt) =>
        `- "${dt.name}": ${dt.description || "Documento institucional"} (acceso sugerido: ${dt.default_access_level})`
    )
    .join("\n");

  const systemPrompt = `Eres un motor de Procesamiento de Lenguaje Natural (PLN) y clasificación documental para la Unidad Educativa San José (Guayaquil, Ecuador).
Debes analizar el texto de un documento institucional y devolver EXCLUSIVAMENTE un objeto JSON válido con esta estructura exacta:
{
  "documentTypeName": "Nombre EXACTO de uno de los tipos documentales permitidos",
  "confidenceScore": 0.0 a 1.0,
  "classificationReason": "Explicación breve en español de por qué corresponde a esa categoría",
  "suggestedTitle": "Título claro y formal del documento (máximo 120 caracteres)",
  "emissionDate": "YYYY-MM-DD o null si no aparece fecha clara",
  "author": "Nombre o cargo del remitente/autor o null",
  "originDepartment": "Dependencia o área emisora (ej. Rectorado, Secretaría General, Vicerrectorado, DECE, Coordinación) o null",
  "topic": "Temática principal en máximo 12 palabras",
  "keywords": ["4 a 8 palabras o frases clave relevantes en español"],
  "entities": [{"text": "nombre entidad", "type": "PERSONA|DEPENDENCIA|INSTITUCION|NORMATIVA|LUGAR"}],
  "summary": "Resumen ejecutivo claro de máximo 2 oraciones en español"
}

Tipos documentales permitidos:
${catalogDescription}`;

  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Nombre del archivo: ${params.fileName}\n\nContenido extraído del documento:\n${excerpt}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(
      `Error en análisis PLN con OpenAI (${response.status}): ${errBody.slice(0, 200)}`
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const rawContent = payload.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error("El modelo de IA devolvió una respuesta vacía.");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawContent) as Record<string, unknown>;
  } catch {
    throw new Error("No se pudo interpretar el JSON devuelto por el modelo de IA.");
  }

  const rawTypeName = String(parsed.documentTypeName ?? "").trim();
  const matchedType =
    params.documentTypes.find(
      (dt) => normalizeLabel(dt.name) === normalizeLabel(rawTypeName)
    ) ??
    params.documentTypes.find((dt) =>
      normalizeLabel(rawTypeName).includes(normalizeLabel(dt.name))
    ) ??
    params.documentTypes[0] ??
    null;

  const rawConfidence = Number(parsed.confidenceScore);
  const confidenceScore = Number.isFinite(rawConfidence)
    ? Math.min(1, Math.max(0, Number(rawConfidence.toFixed(3))))
    : 0.75;

  const keywords = Array.isArray(parsed.keywords)
    ? parsed.keywords
        .map((k) => String(k).trim())
        .filter((k) => k.length > 0)
        .slice(0, 10)
    : [];

  const entities: ExtractedEntity[] = Array.isArray(parsed.entities)
    ? parsed.entities
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
        .map((item) => ({
          text: String(item.text ?? "").trim(),
          type: String(item.type ?? "ENTIDAD").trim().toUpperCase(),
        }))
        .filter((item) => item.text.length > 0)
        .slice(0, 12)
    : [];

  const fallbackTitle = params.fileName.replace(/\.(pdf|docx)$/i, "").replace(/[_-]+/g, " ");

  return {
    documentTypeId: matchedType?.id ?? null,
    documentTypeName: matchedType?.name ?? (rawTypeName || "Sin clasificar"),
    defaultAccessLevel: matchedType?.default_access_level ?? "interno",
    confidenceScore,
    classificationReason:
      String(parsed.classificationReason ?? "").trim() ||
      "Clasificado automáticamente según contenido textual.",
    suggestedTitle:
      String(parsed.suggestedTitle ?? "").trim().slice(0, 140) || fallbackTitle,
    emissionDate: sanitizeIsoDate(parsed.emissionDate),
    author:
      typeof parsed.author === "string" && parsed.author.trim()
        ? parsed.author.trim().slice(0, 160)
        : null,
    originDepartment:
      typeof parsed.originDepartment === "string" && parsed.originDepartment.trim()
        ? parsed.originDepartment.trim().slice(0, 160)
        : null,
    topic:
      typeof parsed.topic === "string" && parsed.topic.trim()
        ? parsed.topic.trim().slice(0, 180)
        : null,
    keywords,
    entities,
    summary:
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim().slice(0, 600)
        : null,
  };
}
