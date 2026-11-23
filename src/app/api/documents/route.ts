import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  analyzeDocumentWithAI,
  generateEmbeddings,
  isAiConfigured,
  toPgVectorLiteral,
  type DocumentTypeOption,
} from "@/lib/ai";
import { extractDocumentText, splitIntoChunks } from "@/lib/document-parser";
import {
  computeSha256,
  sanitizeFileName,
  validateUploadedFile,
} from "@/lib/security";

const MAX_CHUNKS_PER_DOCUMENT = 40;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("documents")
    .select(
      `
      id,
      title,
      file_name,
      file_type,
      file_size_bytes,
      sha256_hash,
      confidence_score,
      access_level,
      created_at,
      document_types ( id, name ),
      document_metadata (
        emission_date,
        author,
        origin_department,
        topic,
        keywords,
        entities,
        summary
      )
    `
    )
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ documents: data ?? [] });
}

export async function POST(request: NextRequest) {
  const startedAt = performance.now();

  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY no está configurada en el servidor." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const userRole = profile?.role ?? "docente";

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Envía el archivo mediante multipart/form-data." },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Selecciona un archivo .pdf o .docx para ingerir." },
      { status: 400 }
    );
  }

  const validation = validateUploadedFile({
    name: file.name,
    size: file.size,
    type: file.type,
  });

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sha256Hash = computeSha256(buffer);

  // Detectar duplicado exacto por huella criptográfica SHA-256
  const { data: duplicate } = await supabase
    .from("documents")
    .select("id, title, file_name")
    .eq("sha256_hash", sha256Hash)
    .maybeSingle();

  if (duplicate) {
    return NextResponse.json(
      {
        error: `Documento duplicado detectado (SHA-256 idéntico): ya existe en el repositorio como "${duplicate.title}" (${duplicate.file_name}).`,
      },
      { status: 409 }
    );
  }

  // Extraer y limpiar texto
  let extractedText = "";
  let totalPages: number | undefined;
  try {
    const parsed = await extractDocumentText(buffer, validation.fileType);
    extractedText = parsed.text;
    totalPages = parsed.pages;
  } catch {
    return NextResponse.json(
      {
        error:
          "No se pudo leer el contenido textual del archivo. Verifica que no esté corrupto o protegido con contraseña.",
      },
      { status: 400 }
    );
  }

  if (extractedText.length < 20) {
    return NextResponse.json(
      {
        error:
          "El archivo no contiene suficiente texto extraíble (si es un PDF escaneado como imagen sin texto OCR, conviértelo primero a PDF con texto o .docx).",
      },
      { status: 400 }
    );
  }

  const chunks = splitIntoChunks(extractedText, 1800, 200).slice(
    0,
    MAX_CHUNKS_PER_DOCUMENT
  );

  // Obtener catálogo de tipos documentales vigente
  const { data: docTypesData, error: typesErr } = await supabase
    .from("document_types")
    .select("id, name, description, default_access_level")
    .order("name");

  if (typesErr || !docTypesData || docTypesData.length === 0) {
    return NextResponse.json(
      { error: "No se encontraron tipos documentales configurados en la BD." },
      { status: 500 }
    );
  }

  const documentTypes = docTypesData as DocumentTypeOption[];

  // Ejecutar clasificación/PLN y embeddings 768D en paralelo con OpenAI
  let analysis;
  let embeddings: number[][];
  try {
    [analysis, embeddings] = await Promise.all([
      analyzeDocumentWithAI({
        fileName: file.name,
        text: extractedText,
        documentTypes,
      }),
      generateEmbeddings(chunks),
    ]);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Error al procesar el documento con IA.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // Determinar nivel de acceso final respetando permisos del rol
  const requestedAccess = String(formData.get("accessLevel") ?? "").trim();
  const canAssignConfidential =
    userRole === "rector" || userRole === "secretaria";

  let finalAccessLevel: "publico" | "interno" | "confidencial" =
    analysis.defaultAccessLevel;

  if (
    requestedAccess === "publico" ||
    requestedAccess === "interno" ||
    (requestedAccess === "confidencial" && canAssignConfidential)
  ) {
    finalAccessLevel = requestedAccess;
  }

  if (!canAssignConfidential && finalAccessLevel === "confidencial") {
    finalAccessLevel = "interno";
  }

  const customTitle = String(formData.get("title") ?? "").trim();
  const finalTitle = customTitle || analysis.suggestedTitle;

  // Subir archivo original al bucket privado 'documentos'
  const year = new Date().getUTCFullYear();
  const safeName = sanitizeFileName(file.name);
  const storagePath = `${year}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadErr } = await supabase.storage
    .from("documentos")
    .upload(storagePath, buffer, {
      contentType:
        validation.fileType === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: false,
    });

  if (uploadErr) {
    return NextResponse.json(
      { error: `No se pudo guardar el archivo en Storage: ${uploadErr.message}` },
      { status: 500 }
    );
  }

  // Insertar registro en public.documents
  const { data: docRow, error: docErr } = await supabase
    .from("documents")
    .insert({
      title: finalTitle,
      file_name: file.name,
      file_type: validation.fileType,
      file_size_bytes: file.size,
      storage_path: storagePath,
      sha256_hash: sha256Hash,
      document_type_id: analysis.documentTypeId,
      confidence_score: analysis.confidenceScore,
      access_level: finalAccessLevel,
      uploaded_by: user.id,
      extracted_text: extractedText,
    })
    .select("id, title, file_name, file_type, file_size_bytes, sha256_hash, confidence_score, access_level, created_at")
    .single();

  if (docErr || !docRow) {
    await supabase.storage.from("documentos").remove([storagePath]);
    return NextResponse.json(
      { error: `Error al registrar el documento: ${docErr?.message ?? "desconocido"}` },
      { status: 500 }
    );
  }

  // Insertar metadatos PLN y vectores en paralelo
  const vectorRows = chunks.map((chunkText, index) => ({
    document_id: docRow.id,
    chunk_index: index,
    chunk_text: chunkText,
    embedding: toPgVectorLiteral(embeddings[index]),
  }));

  const [metaInsert, vecInsert] = await Promise.all([
    supabase.from("document_metadata").insert({
      document_id: docRow.id,
      emission_date: analysis.emissionDate,
      author: analysis.author,
      origin_department: analysis.originDepartment,
      topic: analysis.topic,
      keywords: analysis.keywords,
      entities: analysis.entities,
      summary: analysis.summary,
    }),
    supabase.from("document_vectors").insert(vectorRows),
  ]);

  if (metaInsert.error || vecInsert.error) {
    // Limpiar en caso de fallo parcial
    await supabase.from("documents").delete().eq("id", docRow.id);
    await supabase.storage.from("documentos").remove([storagePath]);
    return NextResponse.json(
      {
        error:
          metaInsert.error?.message ||
          vecInsert.error?.message ||
          "Error al almacenar metadatos o embeddings vectoriales.",
      },
      { status: 500 }
    );
  }

  const processingMs = Math.round(performance.now() - startedAt);

  try {
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "UPLOAD",
      document_id: docRow.id,
      details: {
        file_name: file.name,
        document_type: analysis.documentTypeName,
        confidence_score: analysis.confidenceScore,
        chunks_count: chunks.length,
        processing_ms: processingMs,
      },
    });
  } catch {
    // No bloquear por bitácora
  }

  return NextResponse.json(
    {
      document: {
        ...docRow,
        documentTypeName: analysis.documentTypeName,
        classificationReason: analysis.classificationReason,
        pages: totalPages ?? null,
        chunksIndexed: chunks.length,
        metadata: {
          emission_date: analysis.emissionDate,
          author: analysis.author,
          origin_department: analysis.originDepartment,
          topic: analysis.topic,
          keywords: analysis.keywords,
          entities: analysis.entities,
          summary: analysis.summary,
        },
      },
      processingMs,
    },
    { status: 201 }
  );
}
