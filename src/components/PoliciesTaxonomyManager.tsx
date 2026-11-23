"use client";

import { useState, type FormEvent } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Database,
  FileCheck2,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

export type AccessLevel = "publico" | "interno" | "confidencial";

export interface TaxonomyCategory {
  id: string;
  name: string;
  description: string | null;
  default_access_level: AccessLevel;
  documentCount: number;
}

const ACCESS_META: Record<
  AccessLevel,
  { label: string; badgeClass: string }
> = {
  publico: {
    label: "Público",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-600/20",
  },
  interno: {
    label: "Interno",
    badgeClass: "bg-ue-gold-soft text-[#7A5900] border-ue-gold-dark/25",
  },
  confidencial: {
    label: "Confidencial",
    badgeClass: "bg-ue-crimson-soft text-ue-crimson border-ue-crimson/20",
  },
};

const ROLE_PERMISSIONS_MATRIX = [
  {
    role: "Rector / Equipo Directivo",
    access: "Público • Interno • Confidencial",
    ingest: true,
    search: true,
    deleteDocs: true,
    managePolicies: true,
    auditAll: true,
  },
  {
    role: "Personal Administrativo",
    access: "Público • Interno • Confidencial",
    ingest: true,
    search: true,
    deleteDocs: true,
    managePolicies: false,
    auditAll: false,
  },
  {
    role: "Coordinador de Área",
    access: "Público • Interno",
    ingest: true,
    search: true,
    deleteDocs: false,
    managePolicies: false,
    auditAll: false,
  },
  {
    role: "Docente",
    access: "Público • Interno",
    ingest: true,
    search: true,
    deleteDocs: false,
    managePolicies: false,
    auditAll: false,
  },
];

const METADATA_SCHEMA = {
  extrinsic: [
    { field: "Tipo documental", detail: "Categoría oficial asignada automáticamente por IA + % de confianza." },
    { field: "Fecha de emisión", detail: "Fecha detectada mediante PLN en formato normalizado YYYY-MM-DD." },
    { field: "Autor / Remitente", detail: "Persona o autoridad firmante extraída del contenido." },
    { field: "Dependencia de origen", detail: "Área emisora (Rectorado, Secretaría, Vicerrectorado, DECE, etc.)." },
    { field: "Nivel de acceso (RLS)", detail: "Público, Interno o Confidencial aplicado a nivel de fila en PostgreSQL." },
    { field: "Integridad SHA-256", detail: "Huella criptográfica para detección de duplicados y alteraciones." },
  ],
  intrinsic: [
    { field: "Contenido textual limpio", detail: "Texto extraído de .pdf/.docx sin caracteres de control para indexación." },
    { field: "Temática principal", detail: "Síntesis temática generada por PLN para contextualización rápida." },
    { field: "Palabras clave y entidades", detail: "Términos clave y entidades nombradas (personas, áreas, normativas)." },
    { field: "Resumen ejecutivo", detail: "Descripción breve de hasta 2 oraciones generada automáticamente." },
    { field: "Embeddings vectoriales (768D)", detail: "Vectores por fragmento en pgvector (índice HNSW) para búsqueda semántica." },
    { field: "Relaciones semánticas", detail: "Cálculo dinámico de documentos afines por similitud coseno." },
  ],
};

export function PoliciesTaxonomyManager({
  initialCategories,
}: {
  initialCategories: TaxonomyCategory[];
}) {
  const [categories, setCategories] =
    useState<TaxonomyCategory[]>(initialCategories);

  // Estado formulario nueva categoría
  const [newName, setNewName] = useState("");
  const [newAccess, setNewAccess] = useState<AccessLevel>("interno");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // Estado edición en línea
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAccess, setEditAccess] = useState<AccessLevel>("interno");
  const [editDescription, setEditDescription] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Estado general
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function refreshCategories() {
    const res = await fetch("/api/admin/taxonomy", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { categories: TaxonomyCategory[] };
      setCategories(data.categories);
    }
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setCreating(true);

    try {
      const res = await fetch("/api/admin/taxonomy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          description: newDescription,
          defaultAccessLevel: newAccess,
        }),
      });
      const payload = (await res.json()) as {
        category?: TaxonomyCategory;
        error?: string;
      };

      if (!res.ok) {
        setErrorMsg(payload.error || "No se pudo crear la categoría.");
        return;
      }

      setSuccessMsg(
        `Categoría "${payload.category?.name}" aprobada. El clasificador de IA ya la reconocerá en nuevas cargas.`
      );
      setNewName("");
      setNewDescription("");
      setNewAccess("interno");
      await refreshCategories();
    } catch {
      setErrorMsg("Error de conexión al guardar la categoría.");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(cat: TaxonomyCategory) {
    setErrorMsg(null);
    setSuccessMsg(null);
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditAccess(cat.default_access_level);
    setEditDescription(cat.description ?? "");
  }

  async function handleSaveEdit(id: string) {
    setErrorMsg(null);
    setSuccessMsg(null);
    setSavingEdit(true);

    try {
      const res = await fetch("/api/admin/taxonomy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name: editName,
          description: editDescription,
          defaultAccessLevel: editAccess,
        }),
      });
      const payload = (await res.json()) as { error?: string };

      if (!res.ok) {
        setErrorMsg(payload.error || "No se pudo actualizar la categoría.");
        return;
      }

      setEditingId(null);
      setSuccessMsg("Política y criterio de clasificación actualizados.");
      await refreshCategories();
    } catch {
      setErrorMsg("Error de conexión al actualizar la categoría.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(cat: TaxonomyCategory) {
    const extraWarning =
      cat.documentCount > 0
        ? `\n\nAtención: tiene ${cat.documentCount} documento(s) asociado(s), que quedarán sin categoría asignada.`
        : "";

    if (
      !window.confirm(
        `¿Seguro que deseas eliminar la categoría "${cat.name}" de la taxonomía institucional?${extraWarning}`
      )
    ) {
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setDeletingId(cat.id);

    try {
      const res = await fetch(
        `/api/admin/taxonomy?id=${encodeURIComponent(cat.id)}`,
        { method: "DELETE" }
      );
      const payload = (await res.json()) as { error?: string };

      if (!res.ok) {
        setErrorMsg(payload.error || "No se pudo eliminar la categoría.");
        return;
      }

      setSuccessMsg(`Categoría "${cat.name}" eliminada de la taxonomía.`);
      await refreshCategories();
    } catch {
      setErrorMsg("Error de conexión al eliminar la categoría.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Gestión de Taxonomía Documental */}
      <section className="rounded-3xl border border-ue-border bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-ue-border pb-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ue-crimson text-ue-gold shadow-sm">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Taxonomía Oficial y Criterios de Clasificación IA
              </h2>
              <p className="text-xs text-foreground/65">
                Define los tipos documentales institucionales, su nivel de
                acceso por defecto y la guía semántica para OpenAI.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-ue-crimson/20 bg-ue-crimson-soft px-3 py-1 text-xs font-semibold text-ue-crimson">
            <Sparkles className="h-3.5 w-3.5" />
            Sincronizado en vivo con la IA
          </span>
        </div>

        {/* Formulario nueva categoría */}
        <form
          onSubmit={handleCreate}
          className="mt-5 grid gap-3 rounded-2xl border border-ue-border bg-background p-4 lg:grid-cols-12"
        >
          <div className="lg:col-span-3">
            <label
              htmlFor="tax-name"
              className="mb-1 block text-xs font-semibold text-foreground/80"
            >
              Nuevo tipo documental *
            </label>
            <input
              id="tax-name"
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej. Planificación Microcurricular"
              className="w-full rounded-xl border border-ue-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-ue-crimson focus:ring-2 focus:ring-ue-crimson/15"
            />
          </div>

          <div className="lg:col-span-2">
            <label
              htmlFor="tax-access"
              className="mb-1 block text-xs font-semibold text-foreground/80"
            >
              Acceso por defecto *
            </label>
            <select
              id="tax-access"
              value={newAccess}
              onChange={(e) => setNewAccess(e.target.value as AccessLevel)}
              className="w-full rounded-xl border border-ue-border bg-white px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-ue-crimson"
            >
              <option value="publico">Público</option>
              <option value="interno">Interno</option>
              <option value="confidencial">Confidencial</option>
            </select>
          </div>

          <div className="lg:col-span-5">
            <label
              htmlFor="tax-desc"
              className="mb-1 block text-xs font-semibold text-foreground/80"
            >
              Descripción / criterio para el clasificador IA *
            </label>
            <input
              id="tax-desc"
              type="text"
              required
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Ej. Planificaciones de clase, destrezas y unidades elaboradas por docentes"
              className="w-full rounded-xl border border-ue-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-ue-crimson focus:ring-2 focus:ring-ue-crimson/15"
            />
          </div>

          <div className="flex items-end lg:col-span-2">
            <button
              type="submit"
              disabled={creating}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-ue-crimson px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-ue-crimson-dark disabled:opacity-60"
            >
              {creating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5 text-ue-gold" />
              )}
              Agregar
            </button>
          </div>
        </form>

        {errorMsg && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-xl border border-ue-crimson/25 bg-ue-crimson-soft px-3.5 py-2.5 text-xs font-medium text-ue-crimson-dark"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-ue-crimson" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            role="status"
            className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-600/25 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tabla de categorías */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-ue-border uppercase tracking-wider text-ue-gray">
                <th className="py-2.5 pr-3 font-semibold">Categoría</th>
                <th className="py-2.5 pr-3 font-semibold">
                  Criterio de Clasificación IA
                </th>
                <th className="py-2.5 pr-3 font-semibold">Acceso RLS</th>
                <th className="py-2.5 pr-3 text-center font-semibold">Docs</th>
                <th className="py-2.5 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ue-border/60">
              {categories.map((cat) => {
                const isEditing = editingId === cat.id;
                const accessBadge = ACCESS_META[cat.default_access_level];

                return (
                  <tr key={cat.id} className="hover:bg-ue-crimson-soft/15">
                    <td className="py-3 pr-3 font-bold text-foreground">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full min-w-[140px] rounded-lg border border-ue-crimson/40 bg-white px-2.5 py-1 text-xs font-semibold outline-none"
                        />
                      ) : (
                        cat.name
                      )}
                    </td>
                    <td className="py-3 pr-3 text-foreground/75">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="w-full min-w-[240px] rounded-lg border border-ue-crimson/40 bg-white px-2.5 py-1 text-xs outline-none"
                        />
                      ) : (
                        cat.description || "Sin descripción"
                      )}
                    </td>
                    <td className="py-3 pr-3 whitespace-nowrap">
                      {isEditing ? (
                        <select
                          value={editAccess}
                          onChange={(e) =>
                            setEditAccess(e.target.value as AccessLevel)
                          }
                          className="rounded-lg border border-ue-crimson/40 bg-white px-2 py-1 text-xs font-medium outline-none"
                        >
                          <option value="publico">Público</option>
                          <option value="interno">Interno</option>
                          <option value="confidencial">Confidencial</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${accessBadge.badgeClass}`}
                        >
                          {accessBadge.label}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-center font-mono font-bold text-ue-crimson">
                      {cat.documentCount}
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      {isEditing ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(cat.id)}
                            disabled={savingEdit}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {savingEdit ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="inline-flex items-center gap-1 rounded-lg border border-ue-border bg-white px-2 py-1 text-[11px] font-semibold text-foreground/70 hover:text-foreground"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => startEdit(cat)}
                            className="inline-flex items-center gap-1 rounded-lg border border-ue-border bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground/80 hover:border-ue-crimson hover:text-ue-crimson"
                          >
                            <Pencil className="h-3 w-3" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(cat)}
                            disabled={deletingId === cat.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-ue-crimson/25 bg-ue-crimson-soft/60 px-2.5 py-1 text-[11px] font-semibold text-ue-crimson hover:bg-ue-crimson hover:text-white disabled:opacity-50"
                          >
                            {deletingId === cat.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                            Eliminar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. Jerarquía de Permisos Institucionales (RLS) */}
      <section className="rounded-3xl border border-ue-border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ue-crimson-soft text-ue-crimson">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              Jerarquía de Permisos por Rol (Políticas RLS Activas)
            </h3>
            <p className="text-xs text-foreground/65">
              Reglas aplicadas directamente en PostgreSQL y Supabase Storage
              sobre cada consulta.
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-ue-border uppercase tracking-wider text-ue-gray">
                <th className="py-2.5 pr-3 font-semibold">Rol Institucional</th>
                <th className="py-2.5 pr-3 font-semibold">Niveles Visibles</th>
                <th className="py-2.5 px-2 text-center font-semibold">Ingesta</th>
                <th className="py-2.5 px-2 text-center font-semibold">Búsqueda IA</th>
                <th className="py-2.5 px-2 text-center font-semibold">Eliminar Docs</th>
                <th className="py-2.5 px-2 text-center font-semibold">Taxonomía</th>
                <th className="py-2.5 pl-2 text-center font-semibold">Auditoría Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ue-border/60">
              {ROLE_PERMISSIONS_MATRIX.map((row) => (
                <tr key={row.role}>
                  <td className="py-3 pr-3 font-bold text-foreground">
                    {row.role}
                  </td>
                  <td className="py-3 pr-3 font-medium text-ue-crimson">
                    {row.access}
                  </td>
                  {[
                    row.ingest,
                    row.search,
                    row.deleteDocs,
                    row.managePolicies,
                    row.auditAll,
                  ].map((allowed, idx) => (
                    <td key={idx} className="py-3 px-2 text-center">
                      {allowed ? (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-ue-gray">
                          <X className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Esquema Oficial de Metadatos Intrínsecos y Extrínsecos (Objetivo Específico 2) */}
      <section className="rounded-3xl border border-ue-border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ue-gold-soft text-[#7A5900]">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              Esquema Oficial de Metadatos Documentales (PLN)
            </h3>
            <p className="text-xs text-foreground/65">
              Características extrínsecas e intrínsecas indexadas automáticamente
              en cada documento.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-ue-border bg-background p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-ue-crimson">
              Características Extrínsecas (Contexto y Seguridad)
            </p>
            <ul className="mt-3 space-y-2.5 text-xs">
              {METADATA_SCHEMA.extrinsic.map((m) => (
                <li key={m.field} className="rounded-xl bg-white p-3 border border-ue-border/60">
                  <p className="font-bold text-foreground">{m.field}</p>
                  <p className="mt-0.5 text-foreground/70">{m.detail}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-ue-border bg-background p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-ue-crimson">
              Características Intrínsecas (Contenido y Semántica IA)
            </p>
            <ul className="mt-3 space-y-2.5 text-xs">
              {METADATA_SCHEMA.intrinsic.map((m) => (
                <li key={m.field} className="rounded-xl bg-white p-3 border border-ue-border/60">
                  <p className="font-bold text-foreground">{m.field}</p>
                  <p className="mt-0.5 text-foreground/70">{m.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
