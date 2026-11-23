"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  GitBranch,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  Upload,
  User,
} from "lucide-react";
import type { UserRole } from "@/lib/roles";

export interface DocTypeFilter {
  id: string;
  name: string;
  default_access_level: "publico" | "interno" | "confidencial";
}

export interface IndexedDocumentItem {
  id: string;
  title: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  sha256_hash: string;
  confidence_score: number | null;
  access_level: "publico" | "interno" | "confidencial";
  document_type_name: string | null;
  created_at: string;
  emission_date: string | null;
  author: string | null;
  origin_department: string | null;
  topic: string | null;
  keywords: string[];
  summary: string | null;
}

interface SearchMatchItem {
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
  summary: string | null;
  topic: string | null;
  confidence_score: number | null;
}

interface RelatedDocItem {
  document_id: string;
  title: string;
  document_type_name: string | null;
  similarity: number;
  file_name: string;
}

interface IngestResult {
  document: {
    id: string;
    title: string;
    file_name: string;
    file_type: string;
    sha256_hash: string;
    confidence_score: number;
    access_level: "publico" | "interno" | "confidencial";
    documentTypeName: string;
    classificationReason: string;
    chunksIndexed: number;
    pages: number | null;
    metadata: {
      emission_date: string | null;
      author: string | null;
      origin_department: string | null;
      topic: string | null;
      keywords: string[];
      entities: Array<{ text: string; type: string }>;
      summary: string | null;
    };
  };
  processingMs: number;
}

const ACCESS_STYLES: Record<
  "publico" | "interno" | "confidencial",
  { label: string; className: string }
> = {
  publico: {
    label: "Público",
    className: "bg-emerald-50 text-emerald-700 border-emerald-600/20",
  },
  interno: {
    label: "Interno",
    className: "bg-ue-gold-soft text-[#7A5900] border-ue-gold-dark/25",
  },
  confidencial: {
    label: "Confidencial",
    className: "bg-ue-crimson-soft text-ue-crimson border-ue-crimson/20",
  },
};

const EXAMPLE_QUERIES = [
  "Disposiciones sobre exámenes supletorios o cronograma académico",
  "Actas de junta académica o resoluciones de rectorado",
  "Certificados o solicitudes presentadas por docentes",
];

export function SemanticSearchWorkspace({
  userRole,
  documentTypes,
  initialDocuments,
  aiConfigured,
}: {
  userRole: UserRole;
  documentTypes: DocTypeFilter[];
  initialDocuments: IndexedDocumentItem[];
  aiConfigured: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"buscar" | "ingestar">("buscar");
  const [documents, setDocuments] =
    useState<IndexedDocumentItem[]>(initialDocuments);

  // Estado Búsqueda Semántica
  const [query, setQuery] = useState("");
  const [filterTypeId, setFilterTypeId] = useState<string>("");
  const [minSimilarity, setMinSimilarity] = useState<string>("0.28");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchMatchItem[] | null>(
    null
  );
  const [searchLatencyMs, setSearchLatencyMs] = useState<number | null>(null);

  // Estado Ingesta IA
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [accessLevelOverride, setAccessLevelOverride] = useState<string>("");
  const [ingesting, setIngesting] = useState(false);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [ingestResult, setIngestResult] = useState<IngestResult | null>(null);

  // Estado interactivo por documento (Relacionados + Verificación SHA-256)
  const [relatedMap, setRelatedMap] = useState<
    Record<string, { loading: boolean; items: RelatedDocItem[] | null }>
  >({});
  const [verifyMap, setVerifyMap] = useState<
    Record<
      string,
      { loading: boolean; verified?: boolean; error?: string }
    >
  >({});

  const canAssignConfidential =
    userRole === "rector" || userRole === "secretaria";

  async function refreshDocuments() {
    const res = await fetch("/api/documents", { cache: "no-store" });
    if (!res.ok) return;
    const payload = (await res.json()) as {
      documents?: Array<{
        id: string;
        title: string;
        file_name: string;
        file_type: string;
        file_size_bytes: number;
        sha256_hash: string;
        confidence_score: number | null;
        access_level: "publico" | "interno" | "confidencial";
        created_at: string;
        document_types: { name: string } | { name: string }[] | null;
        document_metadata:
          | {
              emission_date: string | null;
              author: string | null;
              origin_department: string | null;
              topic: string | null;
              keywords: string[] | null;
              summary: string | null;
            }
          | Array<{
              emission_date: string | null;
              author: string | null;
              origin_department: string | null;
              topic: string | null;
              keywords: string[] | null;
              summary: string | null;
            }>
          | null;
      }>;
    };

    const mapped: IndexedDocumentItem[] = (payload.documents ?? []).map((d) => {
      const dt = Array.isArray(d.document_types)
        ? d.document_types[0]
        : d.document_types;
      const meta = Array.isArray(d.document_metadata)
        ? d.document_metadata[0]
        : d.document_metadata;
      return {
        id: d.id,
        title: d.title,
        file_name: d.file_name,
        file_type: d.file_type,
        file_size_bytes: d.file_size_bytes,
        sha256_hash: d.sha256_hash,
        confidence_score: d.confidence_score,
        access_level: d.access_level,
        document_type_name: dt?.name ?? null,
        created_at: d.created_at,
        emission_date: meta?.emission_date ?? null,
        author: meta?.author ?? null,
        origin_department: meta?.origin_department ?? null,
        topic: meta?.topic ?? null,
        keywords: meta?.keywords ?? [],
        summary: meta?.summary ?? null,
      };
    });

    setDocuments(mapped);
  }

  async function runSemanticSearch(customQuery?: string) {
    const q = (customQuery ?? query).trim();
    if (q.length < 3) {
      setSearchError("Escribe al menos 3 caracteres para buscar.");
      return;
    }

    setSearchError(null);
    setSearching(true);

    try {
      const res = await fetch("/api/documents/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          documentTypeId: filterTypeId || null,
          minSimilarity: Number(minSimilarity),
          limit: 12,
        }),
      });

      const payload = (await res.json()) as {
        results?: SearchMatchItem[];
        latencyMs?: number;
        error?: string;
      };

      if (!res.ok) {
        setSearchError(payload.error || "No se pudo completar la búsqueda.");
        return;
      }

      setSearchResults(payload.results ?? []);
      setSearchLatencyMs(payload.latencyMs ?? null);
    } catch {
      setSearchError("Error de conexión al ejecutar la búsqueda semántica.");
    } finally {
      setSearching(false);
    }
  }

  async function handleSearchSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await runSemanticSearch();
  }

  function handleUploadFileChange(e: ChangeEvent<HTMLInputElement>) {
    setIngestError(null);
    setIngestResult(null);
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setUploadFile(null);
      return;
    }
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".pdf") && !lower.endsWith(".docx")) {
      setIngestError("Formato no permitido. Solo se aceptan archivos .pdf y .docx.");
      setUploadFile(null);
      return;
    }
    setUploadFile(file);
  }

  async function handleIngestSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIngestError(null);
    setIngestResult(null);

    if (!uploadFile) {
      setIngestError("Selecciona primero un archivo .pdf o .docx.");
      return;
    }

    setIngesting(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      if (customTitle.trim()) formData.append("title", customTitle.trim());
      if (accessLevelOverride) formData.append("accessLevel", accessLevelOverride);

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      const payload = (await res.json()) as IngestResult & { error?: string };

      if (!res.ok) {
        setIngestError(payload.error || "No se pudo procesar el documento.");
        return;
      }

      setIngestResult(payload);
      setUploadFile(null);
      setCustomTitle("");
      setAccessLevelOverride("");
      await refreshDocuments();
    } catch {
      setIngestError("Error de conexión durante la ingesta con IA.");
    } finally {
      setIngesting(false);
    }
  }

  async function handleLoadRelated(docId: string) {
    setRelatedMap((prev) => ({
      ...prev,
      [docId]: { loading: true, items: prev[docId]?.items ?? null },
    }));
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(docId)}/related`);
      const data = (await res.json()) as { related?: RelatedDocItem[] };
      setRelatedMap((prev) => ({
        ...prev,
        [docId]: { loading: false, items: data.related ?? [] },
      }));
    } catch {
      setRelatedMap((prev) => ({
        ...prev,
        [docId]: { loading: false, items: [] },
      }));
    }
  }

  async function handleVerifyHash(docId: string) {
    setVerifyMap((prev) => ({ ...prev, [docId]: { loading: true } }));
    try {
      const res = await fetch(
        `/api/documents/${encodeURIComponent(docId)}/verify`,
        { method: "POST" }
      );
      const data = (await res.json()) as { verified?: boolean; error?: string };
      if (!res.ok) {
        setVerifyMap((prev) => ({
          ...prev,
          [docId]: { loading: false, error: data.error || "Error al verificar" },
        }));
        return;
      }
      setVerifyMap((prev) => ({
        ...prev,
        [docId]: { loading: false, verified: Boolean(data.verified) },
      }));
    } catch {
      setVerifyMap((prev) => ({
        ...prev,
        [docId]: { loading: false, error: "Error de conexión" },
      }));
    }
  }

  return (
    <div className="space-y-6">
      {!aiConfigured && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-ue-gold-dark/30 bg-ue-gold-soft px-4 py-3 text-xs text-[#594300]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-ue-gold-dark" />
          <span>
            <strong>OPENAI_API_KEY no configurada:</strong> agrega la variable en
            el servidor para ejecutar embeddings vectoriales y clasificación PLN.
          </span>
        </div>
      )}

      {/* Encabezado con selector Búsqueda Semántica / Ingesta IA */}
      <section className="rounded-3xl border border-ue-border bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-ue-border pb-5 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-ue-crimson-soft px-3 py-1 text-[11px] font-bold text-ue-crimson">
              <Sparkles className="h-3.5 w-3.5" />
              OpenAI Embeddings 768D + pgvector + PLN
            </div>
            <h2 className="mt-2 text-lg font-bold text-foreground sm:text-xl">
              Motor Inteligente de Recuperación y Clasificación Documental
            </h2>
            <p className="mt-0.5 text-xs text-foreground/65 sm:text-sm">
              Consulta documentos en lenguaje natural con ranking por relevancia
              o ingesta archivos `.pdf` y `.docx` con clasificación automática.
            </p>
          </div>

          <div className="inline-grid grid-cols-2 rounded-xl border border-ue-border bg-ue-crimson-soft/60 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("buscar")}
              className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                activeTab === "buscar"
                  ? "bg-ue-crimson text-white shadow-sm"
                  : "text-foreground/75 hover:text-ue-crimson"
              }`}
            >
              <Search className="h-4 w-4" />
              Búsqueda Semántica
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ingestar")}
              className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                activeTab === "ingestar"
                  ? "bg-ue-crimson text-white shadow-sm"
                  : "text-foreground/75 hover:text-ue-crimson"
              }`}
            >
              <Upload className="h-4 w-4" />
              Cargar Documento IA
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* TAB 1: BÚSQUEDA SEMÁNTICA EN LENGUAJE NATURAL                     */}
        {/* ================================================================= */}
        {activeTab === "buscar" && (
          <div className="mt-5 space-y-5">
            <form onSubmit={handleSearchSubmit} className="space-y-3">
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ue-crimson" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Pregunta en lenguaje natural (ej. disposiciones sobre exámenes supletorios o actas de consejo)..."
                    className="w-full rounded-xl border border-ue-border bg-background py-3 pl-10 pr-4 text-sm text-foreground outline-none transition placeholder:text-ue-gray focus:border-ue-crimson focus:bg-white focus:ring-2 focus:ring-ue-crimson/15"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searching || !aiConfigured}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-ue-crimson px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-ue-crimson-dark disabled:opacity-50"
                >
                  {searching ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Buscando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-ue-gold" />
                      Buscar con IA
                    </>
                  )}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Filtrar por tipo documental"
                    value={filterTypeId}
                    onChange={(e) => setFilterTypeId(e.target.value)}
                    className="rounded-xl border border-ue-border bg-background px-3 py-1.5 text-xs font-medium text-foreground outline-none focus:border-ue-crimson focus:bg-white"
                  >
                    <option value="">Todos los tipos documentales</option>
                    {documentTypes.map((dt) => (
                      <option key={dt.id} value={dt.id}>
                        {dt.name}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="Relevancia mínima"
                    value={minSimilarity}
                    onChange={(e) => setMinSimilarity(e.target.value)}
                    className="rounded-xl border border-ue-border bg-background px-3 py-1.5 text-xs font-medium text-foreground outline-none focus:border-ue-crimson focus:bg-white"
                  >
                    <option value="0.22">Relevancia mín: 22% (amplia)</option>
                    <option value="0.28">Relevancia mín: 28% (recomendada)</option>
                    <option value="0.40">Relevancia mín: 40% (precisa)</option>
                    <option value="0.55">Relevancia mín: 55% (estricta)</option>
                  </select>
                </div>

                {searchLatencyMs !== null && searchResults !== null && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-600/20 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    <Clock className="h-3.5 w-3.5" />
                    {searchResults.length}{" "}
                    {searchResults.length === 1 ? "resultado" : "resultados"} en{" "}
                    {searchLatencyMs} ms
                  </div>
                )}
              </div>

              {/* Consultas sugeridas */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-semibold text-ue-gray">
                  Ejemplos:
                </span>
                {EXAMPLE_QUERIES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => {
                      setQuery(example);
                      void runSemanticSearch(example);
                    }}
                    className="rounded-full border border-ue-border bg-background px-2.5 py-1 text-[11px] text-foreground/75 transition hover:border-ue-crimson/40 hover:bg-ue-crimson-soft/50 hover:text-ue-crimson"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </form>

            {searchError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-ue-crimson/25 bg-ue-crimson-soft px-4 py-3 text-sm text-ue-crimson-dark"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-ue-crimson" />
                <span>{searchError}</span>
              </div>
            )}

            {/* Resultados Rankeados por Relevancia Semántica */}
            {searchResults !== null && (
              <div className="space-y-4">
                {searchResults.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-ue-border bg-background p-8 text-center">
                    <Search className="mx-auto h-8 w-8 text-ue-gray" />
                    <p className="mt-2 text-sm font-bold text-foreground">
                      No se encontraron documentos con esa relevancia mínima
                    </p>
                    <p className="mt-1 text-xs text-ue-gray">
                      Prueba bajando el umbral de relevancia o cargando documentos
                      en la pestaña <strong>Cargar Documento IA</strong>.
                    </p>
                  </div>
                ) : (
                  searchResults.map((item, idx) => {
                    const similarityPct = Math.round(item.similarity * 100);
                    const access = ACCESS_STYLES[item.access_level];
                    const relatedState = relatedMap[item.document_id];
                    const verifyState = verifyMap[item.document_id];

                    return (
                      <article
                        key={`${item.document_id}-${idx}`}
                        className="rounded-2xl border border-ue-border bg-white p-5 shadow-sm transition hover:border-ue-crimson/40"
                      >
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-ue-crimson px-2.5 py-0.5 text-[11px] font-bold text-white">
                                #{idx + 1} • {similarityPct}% relevancia
                              </span>
                              {item.document_type_name && (
                                <span className="rounded-full border border-ue-crimson/20 bg-ue-crimson-soft px-2.5 py-0.5 text-[11px] font-semibold text-ue-crimson">
                                  {item.document_type_name}
                                </span>
                              )}
                              <span
                                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${access.className}`}
                              >
                                {access.label}
                              </span>
                              {item.confidence_score !== null && (
                                <span className="text-[11px] text-ue-gray">
                                  Confianza IA:{" "}
                                  <strong>
                                    {Math.round(item.confidence_score * 100)}%
                                  </strong>
                                </span>
                              )}
                            </div>

                            <h3 className="mt-2 text-base font-bold text-foreground">
                              {item.title}
                            </h3>
                            <p className="text-xs text-ue-gray">
                              Archivo: {item.file_name} (
                              {item.file_type.toUpperCase()})
                            </p>
                          </div>

                          <div className="flex shrink-0 flex-wrap gap-2">
                            <a
                              href={`/api/documents/${encodeURIComponent(item.document_id)}/download`}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-ue-crimson px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-ue-crimson-dark"
                            >
                              <Download className="h-3.5 w-3.5 text-ue-gold" />
                              Descargar
                            </a>
                            <button
                              type="button"
                              onClick={() => handleLoadRelated(item.document_id)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-ue-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground/80 transition hover:border-ue-crimson hover:text-ue-crimson"
                            >
                              <GitBranch className="h-3.5 w-3.5" />
                              Relacionados
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVerifyHash(item.document_id)}
                              disabled={verifyState?.loading}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-ue-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground/80 transition hover:border-emerald-600 hover:text-emerald-700"
                            >
                              {verifyState?.loading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <ShieldCheck className="h-3.5 w-3.5" />
                              )}
                              SHA-256
                            </button>
                          </div>
                        </div>

                        {/* Fragmento semántico más relevante */}
                        <blockquote className="mt-3 rounded-xl border-l-4 border-ue-gold bg-background px-4 py-3 text-xs leading-relaxed text-foreground/85">
                          “{item.chunk_text.slice(0, 420)}
                          {item.chunk_text.length > 420 ? "..." : ""}”
                        </blockquote>

                        {/* Metadatos PLN extraídos */}
                        <div className="mt-3 grid gap-2 rounded-xl border border-ue-border/70 bg-ue-crimson-soft/20 p-3 text-xs sm:grid-cols-3">
                          <div className="flex items-center gap-1.5 text-foreground/80">
                            <Calendar className="h-3.5 w-3.5 text-ue-crimson" />
                            <span>
                              <strong>Fecha:</strong>{" "}
                              {item.emission_date || "No detectada"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-foreground/80">
                            <User className="h-3.5 w-3.5 text-ue-crimson" />
                            <span className="truncate">
                              <strong>Autor:</strong>{" "}
                              {item.author || "No detectado"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-foreground/80">
                            <Building2 className="h-3.5 w-3.5 text-ue-crimson" />
                            <span className="truncate">
                              <strong>Dependencia:</strong>{" "}
                              {item.origin_department || "General"}
                            </span>
                          </div>
                        </div>

                        {item.summary && (
                          <p className="mt-2.5 text-xs leading-relaxed text-foreground/75">
                            <strong className="text-foreground">
                              Resumen PLN:
                            </strong>{" "}
                            {item.summary}
                          </p>
                        )}

                        {item.keywords && item.keywords.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                            <Tag className="h-3 w-3 text-ue-gray" />
                            {item.keywords.map((kw) => (
                              <span
                                key={kw}
                                className="rounded-md bg-background px-2 py-0.5 text-[11px] text-foreground/75 border border-ue-border/70"
                              >
                                {kw}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Estado verificación SHA-256 */}
                        {verifyState && !verifyState.loading && (
                          <div
                            className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
                              verifyState.verified
                                ? "border border-emerald-600/20 bg-emerald-50 text-emerald-800"
                                : "border border-red-300 bg-red-50 text-red-800"
                            }`}
                          >
                            {verifyState.verified ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                Integridad SHA-256 verificada: el archivo en
                                Storage coincide 100% con su huella original (
                                <code className="font-mono">
                                  {item.sha256_hash.slice(0, 14)}…
                                </code>
                                ).
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-4 w-4 text-red-600" />
                                {verifyState.error ||
                                  "Alerta: la huella SHA-256 no coincide."}
                              </>
                            )}
                          </div>
                        )}

                        {/* Documentos relacionados semánticamente */}
                        {relatedState && (
                          <div className="mt-3 rounded-xl border border-ue-border bg-background p-3">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-ue-crimson">
                              Relaciones Semánticas entre Documentos
                            </p>
                            {relatedState.loading ? (
                              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ue-gray">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Calculando similitud vectorial...
                              </p>
                            ) : relatedState.items &&
                              relatedState.items.length > 0 ? (
                              <ul className="mt-2 space-y-1.5">
                                {relatedState.items.map((rel) => (
                                  <li
                                    key={rel.document_id}
                                    className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-1.5 text-xs border border-ue-border/60"
                                  >
                                    <span className="truncate font-medium text-foreground">
                                      {rel.title}{" "}
                                      {rel.document_type_name && (
                                        <span className="text-ue-gray">
                                          ({rel.document_type_name})
                                        </span>
                                      )}
                                    </span>
                                    <span className="shrink-0 rounded-full bg-ue-gold-soft px-2 py-0.5 text-[10px] font-bold text-[#7A5900]">
                                      {Math.round(rel.similarity * 100)}% afín
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="mt-1 text-xs text-ue-gray">
                                No hay otros documentos relacionados con similitud
                                suficiente todavía.
                              </p>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: INGESTA Y CLASIFICACIÓN AUTOMÁTICA CON OPENAI              */}
        {/* ================================================================= */}
        {activeTab === "ingestar" && (
          <div className="mt-5 space-y-5">
            <form onSubmit={handleIngestSubmit} className="space-y-4">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ue-crimson/35 bg-background px-6 py-8 text-center transition hover:border-ue-crimson hover:bg-ue-crimson-soft/30">
                <Upload className="h-8 w-8 text-ue-crimson" />
                <span className="mt-2 text-sm font-bold text-foreground">
                  {uploadFile
                    ? uploadFile.name
                    : "Selecciona un documento institucional (.pdf o .docx)"}
                </span>
                <span className="mt-1 text-xs text-ue-gray">
                  {uploadFile
                    ? `${(uploadFile.size / 1024).toFixed(1)} KB listo para análisis PLN, clasificación y vectorización`
                    : "Máximo 10 MB • Cálculo SHA-256 + Clasificación OpenAI + Embeddings 768D"}
                </span>
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleUploadFileChange}
                  className="hidden"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="doc-title"
                    className="mb-1.5 block text-xs font-semibold text-foreground/80"
                  >
                    Título personalizado (opcional — la IA sugiere uno automático)
                  </label>
                  <input
                    id="doc-title"
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Dejar vacío para título automático por PLN"
                    className="w-full rounded-xl border border-ue-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-ue-crimson focus:bg-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="doc-access"
                    className="mb-1.5 block text-xs font-semibold text-foreground/80"
                  >
                    Nivel de acceso (opcional — automático según tipo)
                  </label>
                  <select
                    id="doc-access"
                    value={accessLevelOverride}
                    onChange={(e) => setAccessLevelOverride(e.target.value)}
                    className="w-full rounded-xl border border-ue-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-ue-crimson focus:bg-white"
                  >
                    <option value="">Automático según clasificación IA</option>
                    <option value="publico">Público</option>
                    <option value="interno">Interno</option>
                    {canAssignConfidential && (
                      <option value="confidencial">Confidencial</option>
                    )}
                  </select>
                </div>
              </div>

              {ingestError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-ue-crimson/25 bg-ue-crimson-soft px-4 py-3 text-sm text-ue-crimson-dark"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-ue-crimson" />
                  <span>{ingestError}</span>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!uploadFile || ingesting || !aiConfigured}
                  className="inline-flex items-center gap-2 rounded-xl bg-ue-crimson px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-ue-crimson-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {ingesting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Clasificando y vectorizando con IA...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-ue-gold" />
                      Ingestar y Clasificar con IA
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Reporte inmediato tras ingesta exitosa */}
            {ingestResult && (
              <div className="rounded-2xl border border-emerald-600/25 bg-emerald-50/50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-600/15 pb-3">
                  <div className="flex items-center gap-2 text-emerald-900">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <h3 className="text-sm font-bold">
                      Documento indexado y clasificado automáticamente
                    </h3>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-600/20">
                    {ingestResult.document.chunksIndexed}{" "}
                    {ingestResult.document.chunksIndexed === 1
                      ? "vector"
                      : "vectores"}{" "}
                    • {ingestResult.processingMs} ms
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3 text-xs">
                  <div className="rounded-xl bg-white p-3 border border-ue-border/70">
                    <p className="text-ue-gray">Tipo documental IA</p>
                    <p className="mt-1 text-sm font-bold text-ue-crimson">
                      {ingestResult.document.documentTypeName}
                    </p>
                    <p className="mt-0.5 text-[11px] text-foreground/70">
                      Confianza:{" "}
                      <strong>
                        {Math.round(ingestResult.document.confidence_score * 100)}%
                      </strong>
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3 border border-ue-border/70">
                    <p className="text-ue-gray">Metadatos PLN</p>
                    <p className="mt-1 font-semibold text-foreground">
                      {ingestResult.document.metadata.origin_department ||
                        "Dependencia general"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-foreground/70">
                      Fecha:{" "}
                      {ingestResult.document.metadata.emission_date || "N/D"} •
                      Autor: {ingestResult.document.metadata.author || "N/D"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3 border border-ue-border/70">
                    <p className="text-ue-gray">Integridad SHA-256</p>
                    <p className="mt-1 truncate font-mono text-[11px] font-semibold text-foreground">
                      {ingestResult.document.sha256_hash}
                    </p>
                    <p className="mt-0.5 text-[11px] text-emerald-700 font-medium">
                      Guardado en bucket privado
                    </p>
                  </div>
                </div>

                {ingestResult.document.metadata.summary && (
                  <p className="mt-3 text-xs leading-relaxed text-foreground/80">
                    <strong>Resumen PLN:</strong>{" "}
                    {ingestResult.document.metadata.summary}
                  </p>
                )}

                <p className="mt-2 text-xs text-foreground/70">
                  <strong>Justificación de clasificación:</strong>{" "}
                  {ingestResult.document.classificationReason}
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Repositorio de Documentos Indexados Recientes */}
      <section className="rounded-3xl border border-ue-border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ue-crimson-soft text-ue-crimson">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Documentos Indexados en el Repositorio ({documents.length})
              </h3>
              <p className="text-xs text-foreground/65">
                Visibles según tu nivel de autorización RLS.
              </p>
            </div>
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-ue-border bg-background p-8 text-center">
            <FileText className="mx-auto h-8 w-8 text-ue-gray" />
            <p className="mt-2 text-sm font-bold text-foreground">
              Todavía no hay documentos indexados
            </p>
            <p className="mt-1 text-xs text-ue-gray">
              Usa la pestaña <strong>Cargar Documento IA</strong> para subir tu
              primer PDF o DOCX y probar la clasificación y búsqueda semántica.
            </p>
          </div>
        ) : (
          <div className="mt-4 max-h-[380px] overflow-y-auto overflow-x-auto pr-1">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-ue-border uppercase tracking-wider text-ue-gray">
                  <th className="py-2.5 pr-3 font-semibold">Documento</th>
                  <th className="py-2.5 pr-3 font-semibold">Categoría IA</th>
                  <th className="py-2.5 pr-3 font-semibold">Acceso</th>
                  <th className="py-2.5 pr-3 font-semibold">Metadatos PLN</th>
                  <th className="py-2.5 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ue-border/60">
                {documents.map((doc) => {
                  const access = ACCESS_STYLES[doc.access_level];
                  const verifyState = verifyMap[doc.id];
                  return (
                    <tr key={doc.id} className="hover:bg-ue-crimson-soft/15">
                      <td className="py-3 pr-3">
                        <p className="font-semibold text-foreground">
                          {doc.title}
                        </p>
                        <p className="text-[11px] text-ue-gray">
                          {doc.file_name} •{" "}
                          {(doc.file_size_bytes / 1024).toFixed(1)} KB
                        </p>
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        <span className="rounded-full border border-ue-crimson/20 bg-ue-crimson-soft px-2.5 py-0.5 text-[11px] font-semibold text-ue-crimson">
                          {doc.document_type_name || "Sin tipo"}
                        </span>
                        {doc.confidence_score !== null && (
                          <p className="mt-1 text-[10px] text-ue-gray">
                            Confianza:{" "}
                            {Math.round(doc.confidence_score * 100)}%
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${access.className}`}
                        >
                          {access.label}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-foreground/75">
                        <p className="truncate max-w-[220px]">
                          {doc.origin_department || "Dependencia general"}
                          {doc.emission_date ? ` • ${doc.emission_date}` : ""}
                        </p>
                        {doc.topic && (
                          <p className="truncate max-w-[220px] text-[11px] text-ue-gray">
                            {doc.topic}
                          </p>
                        )}
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <a
                            href={`/api/documents/${encodeURIComponent(doc.id)}/download`}
                            className="inline-flex items-center gap-1 rounded-lg bg-ue-crimson px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-ue-crimson-dark"
                          >
                            <Download className="h-3 w-3 text-ue-gold" />
                            Descargar
                          </a>
                          <button
                            type="button"
                            onClick={() => handleVerifyHash(doc.id)}
                            disabled={verifyState?.loading}
                            className="inline-flex items-center gap-1 rounded-lg border border-ue-border bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground/80 hover:border-emerald-600 hover:text-emerald-700"
                          >
                            {verifyState?.loading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : verifyState?.verified ? (
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <ShieldCheck className="h-3 w-3" />
                            )}
                            {verifyState?.verified ? "Verificado" : "SHA-256"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
