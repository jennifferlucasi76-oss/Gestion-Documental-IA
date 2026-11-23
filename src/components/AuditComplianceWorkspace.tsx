"use client";

import { useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Download,
  FileCheck2,
  KeyRound,
  Loader2,
  Search,
  ShieldCheck,
} from "lucide-react";

export interface AuditLogRow {
  id: string;
  action: string;
  actorName: string;
  actorId: string;
  actorRole: string;
  detail: string;
  createdAtIso: string;
  createdAtLabel: string;
}

interface BatchVerifyItem {
  id: string;
  title: string;
  fileName: string;
  storedHash: string;
  computedHash: string | null;
  status: "verified" | "mismatch" | "missing";
}

interface BatchVerifyResponse {
  totalChecked: number;
  verifiedCount: number;
  issueCount: number;
  checkedAt: string;
  results: BatchVerifyItem[];
}

const ACTION_META: Record<string, { label: string; badgeClass: string }> = {
  LOGIN: {
    label: "Inicio de sesión",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-500/20",
  },
  CREATE_USER: {
    label: "Usuario creado",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-600/20",
  },
  BULK_IMPORT_USERS: {
    label: "Carga masiva Excel",
    badgeClass: "bg-ue-gold-soft text-[#7A5900] border-ue-gold-dark/25",
  },
  DELETE_USER: {
    label: "Usuario eliminado",
    badgeClass: "bg-ue-crimson-soft text-ue-crimson border-ue-crimson/20",
  },
  CHANGE_PASSWORD: {
    label: "Cambio de clave",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-500/20",
  },
  UPLOAD: {
    label: "Documento cargado",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-600/20",
  },
  SEARCH: {
    label: "Búsqueda semántica",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
  },
  DOWNLOAD: {
    label: "Descarga segura",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-500/25",
  },
  VERIFY_HASH: {
    label: "Verificación SHA-256",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-600/20",
  },
  DELETE_DOCUMENT: {
    label: "Documento eliminado",
    badgeClass: "bg-ue-crimson-soft text-ue-crimson border-ue-crimson/20",
  },
  UPDATE_TAXONOMY: {
    label: "Política / Taxonomía",
    badgeClass: "bg-ue-gold-soft text-[#7A5900] border-ue-gold-dark/25",
  },
};

export function AuditComplianceWorkspace({
  totalEvents,
  totalDocuments,
  verifiedEventsCount,
  securityAdoptionPct,
  updatedPasswords,
  totalUsers,
  initialLogs,
}: {
  totalEvents: number;
  totalDocuments: number;
  verifiedEventsCount: number;
  securityAdoptionPct: number;
  updatedPasswords: number;
  totalUsers: number;
  initialLogs: AuditLogRow[];
}) {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const [verifyingAll, setVerifyingAll] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyReport, setVerifyReport] = useState<BatchVerifyResponse | null>(
    null
  );

  async function handleBatchVerify() {
    setVerifyError(null);
    setVerifyingAll(true);
    try {
      const res = await fetch("/api/admin/audit/verify-all", {
        method: "POST",
      });
      const payload = (await res.json()) as BatchVerifyResponse & {
        error?: string;
      };
      if (!res.ok) {
        setVerifyError(
          payload.error || "No se pudo ejecutar la verificación masiva."
        );
        return;
      }
      setVerifyReport(payload);
    } catch {
      setVerifyError("Error de conexión al verificar integridad SHA-256.");
    } finally {
      setVerifyingAll(false);
    }
  }

  const filteredLogs = initialLogs.filter((row) => {
    if (actionFilter !== "all" && row.action !== actionFilter) return false;
    if (dateFrom && row.createdAtIso.slice(0, 10) < dateFrom) return false;
    if (dateTo && row.createdAtIso.slice(0, 10) > dateTo) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      row.actorName.toLowerCase().includes(q) ||
      row.actorId.toLowerCase().includes(q) ||
      row.detail.toLowerCase().includes(q) ||
      row.action.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* 1. KPIs de Seguridad y Cumplimiento */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-ue-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground/65">
              Eventos Auditados
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ue-crimson-soft text-ue-crimson">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-foreground">
            {totalEvents}
          </p>
          <p className="mt-1 text-xs text-ue-gray">
            Trazabilidad inmutable en bitácora
          </p>
        </div>

        <div className="rounded-2xl border border-ue-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground/65">
              Activos con SHA-256
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <FileCheck2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-emerald-700">
            {totalDocuments}
          </p>
          <p className="mt-1 text-xs text-ue-gray">
            100% con huella criptográfica única
          </p>
        </div>

        <div className="rounded-2xl border border-ue-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground/65">
              Auditorías SHA-256
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ue-gold-soft text-[#7A5900]">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-ue-crimson">
            {verifiedEventsCount}
          </p>
          <p className="mt-1 text-xs text-ue-gray">
            Comprobaciones registradas en historial
          </p>
        </div>

        <div className="rounded-2xl border border-ue-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground/65">
              Cumplimiento de Claves
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <KeyRound className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-blue-700">
            {securityAdoptionPct}%
          </p>
          <p className="mt-1 text-xs text-ue-gray">
            {updatedPasswords} de {totalUsers} cuentas con clave robusta
          </p>
        </div>
      </section>

      {/* 2. Acciones de Cumplimiento (Verificación Masiva SHA-256 + Reporte MINEDUC) */}
      <section className="rounded-3xl border border-ue-border bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Control de Integridad y Reporte para Organismos de Control
            </h2>
            <p className="mt-0.5 text-xs text-foreground/65 sm:text-sm">
              Comprueba en vivo que ningún archivo almacenado en Supabase Storage
              ha sido alterado y exporta evidencias para auditorías del Ministerio
              de Educación.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={handleBatchVerify}
              disabled={verifyingAll}
              className="inline-flex items-center gap-2 rounded-xl bg-ue-crimson px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-ue-crimson-dark disabled:opacity-60 sm:text-sm"
            >
              {verifyingAll ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando SHA-256...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 text-ue-gold" />
                  Auditar Integridad del Repositorio
                </>
              )}
            </button>

            <a
              href="/api/admin/audit/export"
              className="inline-flex items-center gap-2 rounded-xl border border-ue-crimson/30 bg-ue-crimson-soft/60 px-4 py-2.5 text-xs font-semibold text-ue-crimson transition hover:bg-ue-crimson hover:text-white sm:text-sm"
            >
              <Download className="h-4 w-4" />
              Exportar Reporte MINEDUC (.xlsx)
            </a>
          </div>
        </div>

        {verifyError && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-xl border border-ue-crimson/25 bg-ue-crimson-soft px-3.5 py-2.5 text-xs font-medium text-ue-crimson-dark"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-ue-crimson" />
            <span>{verifyError}</span>
          </div>
        )}

        {verifyReport && (
          <div
            className={`mt-5 rounded-2xl border p-4 ${
              verifyReport.issueCount === 0
                ? "border-emerald-600/25 bg-emerald-50/50"
                : "border-red-300 bg-red-50/60"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {verifyReport.issueCount === 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <p className="text-sm font-bold text-foreground">
                  {verifyReport.totalChecked === 0
                    ? "No hay documentos cargados para verificar todavía."
                    : verifyReport.issueCount === 0
                    ? `Auditoría aprobada: ${verifyReport.verifiedCount} de ${verifyReport.totalChecked} archivos íntegros (SHA-256 idéntico).`
                    : `Atención: ${verifyReport.issueCount} archivo(s) presentaron discrepancias de integridad.`}
                </p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-foreground/75 border border-ue-border">
                Comprobados: {verifyReport.totalChecked}
              </span>
            </div>

            {verifyReport.results.length > 0 && (
              <div className="mt-3 max-h-52 overflow-y-auto rounded-xl border border-black/5 bg-white p-3">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-ue-border text-ue-gray">
                      <th className="py-1.5 pr-3 font-semibold">Documento</th>
                      <th className="py-1.5 pr-3 font-semibold">SHA-256 Registrado</th>
                      <th className="py-1.5 text-right font-semibold">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ue-border/60">
                    {verifyReport.results.map((item) => (
                      <tr key={item.id}>
                        <td className="py-1.5 pr-3 font-medium text-foreground">
                          {item.title}{" "}
                          <span className="text-ue-gray">({item.fileName})</span>
                        </td>
                        <td className="py-1.5 pr-3 font-mono text-[11px] text-foreground/75">
                          {item.storedHash.slice(0, 20)}…
                        </td>
                        <td className="py-1.5 text-right">
                          {item.status === "verified" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" />
                              Íntegro
                            </span>
                          ) : item.status === "missing" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
                              No hallado en Storage
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700">
                              Alterado
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3. Bitácora Completa Filtrable con Scroll Interno */}
      <section className="rounded-3xl border border-ue-border bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-ue-border pb-4 lg:flex-row lg:items-center">
          <div>
            <h3 className="text-base font-bold text-foreground">
              Bitácora Completa de Trazabilidad ({filteredLogs.length})
            </h3>
            <p className="text-xs text-foreground/65">
              Filtra eventos por acción, usuario, cédula o rango de fechas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ue-gray" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar usuario, cédula o detalle..."
                className="w-56 rounded-xl border border-ue-border bg-background py-1.5 pl-8 pr-3 text-xs text-foreground outline-none focus:border-ue-crimson focus:bg-white"
              />
            </div>

            <select
              aria-label="Filtrar por tipo de acción"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="rounded-xl border border-ue-border bg-background px-3 py-1.5 text-xs font-medium text-foreground outline-none focus:border-ue-crimson focus:bg-white"
            >
              <option value="all">Todas las acciones</option>
              {Object.entries(ACTION_META).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>

            <input
              type="date"
              aria-label="Fecha desde"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-xl border border-ue-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-ue-crimson focus:bg-white"
            />
            <input
              type="date"
              aria-label="Fecha hasta"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-xl border border-ue-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-ue-crimson focus:bg-white"
            />
          </div>
        </div>

        <div className="mt-4 max-h-[420px] overflow-y-auto overflow-x-auto pr-1">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-ue-border uppercase tracking-wider text-ue-gray">
                <th className="py-2.5 pr-3 font-semibold">Fecha y Hora</th>
                <th className="py-2.5 pr-3 font-semibold">Evento</th>
                <th className="py-2.5 pr-3 font-semibold">Usuario</th>
                <th className="py-2.5 pr-3 font-semibold">Rol</th>
                <th className="py-2.5 font-semibold">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ue-border/60">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-sm text-ue-gray"
                  >
                    No hay eventos que coincidan con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((ev) => {
                  const meta = ACTION_META[ev.action] ?? {
                    label: ev.action,
                    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
                  };
                  return (
                    <tr key={ev.id} className="hover:bg-ue-crimson-soft/15">
                      <td className="py-2.5 pr-3 whitespace-nowrap font-mono text-[11px] text-ue-gray">
                        {ev.createdAtLabel}
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.badgeClass}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <p className="font-semibold text-foreground">
                          {ev.actorName}
                        </p>
                        <p className="font-mono text-[10px] text-ue-gray">
                          C.I. {ev.actorId}
                        </p>
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap text-foreground/75">
                        {ev.actorRole}
                      </td>
                      <td className="py-2.5 text-foreground/80">{ev.detail}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
