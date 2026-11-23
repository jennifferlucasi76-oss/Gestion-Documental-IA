import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateEmbeddings,
  isAiConfigured,
  toPgVectorLiteral,
} from "@/lib/ai";

interface MatchDocumentRpcRow {
  document_id: string;
  title: string;
  file_name: string;
  file_type: string;
  access_level: "publico" | "interno" | "confidencial";
  document_type_name: string | null;
  chunk_text: string;
  similarity: number;
  emission_date: string | null;
  author: string | null;
  origin_department: string | null;
  keywords: string[] | null;
  sha256_hash: string;
  created_at: string;
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

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Cuerpo de búsqueda inválido." },
      { status: 400 }
    );
  }

  const query = String(body.query ?? "").trim();
  if (query.length < 3) {
    return NextResponse.json(
      { error: "Escribe al menos 3 caracteres para realizar la búsqueda semántica." },
      { status: 400 }
    );
  }

  const rawTypeId = body.documentTypeId ? String(body.documentTypeId).trim() : null;
  const rawThreshold = Number(body.minSimilarity ?? 0.28);
  const matchThreshold = Number.isFinite(rawThreshold)
    ? Math.min(0.95, Math.max(0.1, rawThreshold))
    : 0.28;
  const rawLimit = Number(body.limit ?? 12);
  const matchCount = Number.isFinite(rawLimit)
    ? Math.min(30, Math.max(1, Math.round(rawLimit)))
    : 12;

  let queryEmbedding: number[];
  try {
    const vectors = await generateEmbeddings([query]);
    queryEmbedding = vectors[0];
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Error generando embedding de consulta.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const { data: rpcRows, error: rpcErr } = await supabase.rpc(
    "match_documents",
    {
      query_embedding: toPgVectorLiteral(queryEmbedding),
      match_threshold: matchThreshold,
      match_count: matchCount,
      filter_type_id: rawTypeId || null,
    }
  );

  if (rpcErr) {
    return NextResponse.json(
      { error: `Error en búsqueda vectorial: ${rpcErr.message}` },
      { status: 500 }
    );
  }

  const matches = (rpcRows ?? []) as MatchDocumentRpcRow[];
  const docIds = matches.map((m) => m.document_id);

  // Hidratar resumen, temática, entidades y confianza IA
  const metaMap = new Map<
    string,
    {
      summary: string | null;
      topic: string | null;
      entities: Array<{ text: string; type: string }>;
    }
  >();
  const confidenceMap = new Map<string, number | null>();

  if (docIds.length > 0) {
    const [metaRes, docsRes] = await Promise.all([
      supabase
        .from("document_metadata")
        .select("document_id, summary, topic, entities")
        .in("document_id", docIds),
      supabase
        .from("documents")
        .select("id, confidence_score")
        .in("id", docIds),
    ]);

    for (const m of metaRes.data ?? []) {
      metaMap.set(m.document_id, {
        summary: m.summary ?? null,
        topic: m.topic ?? null,
        entities: Array.isArray(m.entities)
          ? (m.entities as Array<{ text: string; type: string }>)
          : [],
      });
    }
    for (const d of docsRes.data ?? []) {
      confidenceMap.set(d.id, d.confidence_score ?? null);
    }
  }

  const results = matches.map((row) => {
    const extra = metaMap.get(row.document_id);
    return {
      ...row,
      summary: extra?.summary ?? null,
      topic: extra?.topic ?? null,
      entities: extra?.entities ?? [],
      confidence_score: confidenceMap.get(row.document_id) ?? null,
    };
  });

  const latencyMs = Math.round(performance.now() - startedAt);

  try {
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "SEARCH",
      details: {
        query,
        results_count: results.length,
        latency_ms: latencyMs,
        filter_type_id: rawTypeId,
      },
    });
  } catch {
    // No bloquear por bitácora
  }

  return NextResponse.json({
    query,
    latencyMs,
    results,
  });
}
