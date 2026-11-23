import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Database,
  FileText,
  FolderKanban,
  KeyRound,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import type { UserRole } from "@/lib/roles";

export interface RoleDistributionItem {
  role: UserRole;
  label: string;
  count: number;
  barClass: string;
  dotClass: string;
}

export interface DocumentTypeSummary {
  id: string;
  name: string;
  accessLevel: "publico" | "interno" | "confidencial";
  documentCount: number;
}

export interface AuditEventItem {
  id: string;
  action: string;
  actorName: string;
  actorId: string;
  detail: string;
  createdAt: string;
}

export interface RectorDashboardData {
  dateLabel: string;
  geminiConfigured: boolean;
  totalUsers: number;
  updatedPasswordCount: number;
  pendingPasswordCount: number;
  securityAdoptionPct: number;
  roleDistribution: RoleDistributionItem[];
  totalDocuments: number;
  storageLabel: string;
  avgConfidencePct: number | null;
  lowConfidenceCount: number;
  documentTypes: DocumentTypeSummary[];
  recentAuditEvents: AuditEventItem[];
}

const ACCESS_BADGE: Record<
  DocumentTypeSummary["accessLevel"],
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

const AUDIT_ACTION_META: Record<
  string,
  { label: string; badgeClass: string }
> = {
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
  VIEW: {
    label: "Consulta documental",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
  },
  DOWNLOAD: {
    label: "Descarga de archivo",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-500/25",
  },
  VERIFY_HASH: {
    label: "Verificación SHA-256",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-600/20",
  },
};

export function RectorExecutiveDashboard({
  data,
}: {
  data: RectorDashboardData;
}) {
  const maxDocCount = Math.max(
    1,
    ...data.documentTypes.map((dt) => dt.documentCount)
  );

  return (
    <div className="space-y-6">
      {/* 1. Encabezado Ejecutivo + Semáforo del Sistema */}
      <section className="relative overflow-hidden rounded-3xl border border-ue-border bg-white p-6 shadow-sm">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-ue-gold via-ue-crimson to-ue-crimson-deep" />
        <div className="flex flex-col justify-between gap-5 pl-2 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ue-crimson">
              Resumen Ejecutivo • {data.dateLabel}
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Centro de Control Documental y Seguridad
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-foreground/65">
              Monitoreo en tiempo real de cuentas institucionales, taxonomía
              documental, políticas de acceso y trazabilidad de auditoría.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-600/20 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <Database className="h-3.5 w-3.5" />
              PostgreSQL + pgvector
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-600/20 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <ShieldCheck className="h-3.5 w-3.5" />
              RLS + SHA-256
            </div>
            <div
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
                data.geminiConfigured
                  ? "border-emerald-600/20 bg-emerald-50/70 text-emerald-800"
                  : "border-ue-gold-dark/25 bg-ue-gold-soft/80 text-[#7A5900]"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  data.geminiConfigured ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              <Sparkles className="h-3.5 w-3.5" />
              {data.geminiConfigured ? "Motor IA Activo" : "Motor IA Pendiente"}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Cuatro Tarjetas KPI en Vivo */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-ue-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground/65">
              Usuarios Registrados
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ue-crimson-soft text-ue-crimson">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-foreground">
            {data.totalUsers}
          </p>
          <p className="mt-1 text-xs text-ue-gray">
            Cuentas activas con control de acceso por rol
          </p>
        </div>

        <div className="rounded-2xl border border-ue-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground/65">
              Adopción de Clave Segura
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <KeyRound className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-blue-700">
            {data.securityAdoptionPct}%
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${data.securityAdoptionPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-ue-gray">
            {data.updatedPasswordCount} actualizadas •{" "}
            {data.pendingPasswordCount} pendientes
          </p>
        </div>

        <div className="rounded-2xl border border-ue-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground/65">
              Documentos Indexados
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ue-gold-soft text-[#7A5900]">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-ue-crimson">
            {data.totalDocuments}
          </p>
          <p className="mt-1 text-xs text-ue-gray">
            Almacenamiento ocupado: {data.storageLabel}
          </p>
        </div>

        <div className="rounded-2xl border border-ue-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground/65">
              Taxonomía y Precisión IA
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ue-crimson text-ue-gold">
              <FolderKanban className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-foreground">
            {data.documentTypes.length}
          </p>
          <p className="mt-1 text-xs text-ue-gray">
            {data.avgConfidencePct !== null
              ? `Confianza promedio IA: ${data.avgConfidencePct}%`
              : "Tipos documentales activos (sin ingesta aún)"}
          </p>
        </div>
      </section>

      {/* 3. Fila de Gráficos Ejecutivos (2 columnas) */}
      <section className="grid gap-5 lg:grid-cols-2">
        {/* Distribución de Usuarios por Rol */}
        <div className="rounded-3xl border border-ue-border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-foreground">
                Distribución de Usuarios por Rol
              </h3>
              <p className="text-xs text-foreground/60">
                Personal registrado en la Unidad Educativa San José
              </p>
            </div>
            <Link
              href="/panel/rector/usuarios"
              className="inline-flex items-center gap-1 rounded-lg bg-ue-crimson-soft px-2.5 py-1.5 text-xs font-semibold text-ue-crimson transition hover:bg-ue-crimson hover:text-white"
            >
              Gestionar
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-5 space-y-4">
            {data.roleDistribution.map((item) => {
              const pct =
                data.totalUsers > 0
                  ? Math.round((item.count / data.totalUsers) * 100)
                  : 0;
              return (
                <div key={item.role}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-semibold text-foreground">
                      <span className={`h-2.5 w-2.5 rounded-full ${item.dotClass}`} />
                      {item.label}
                    </span>
                    <span className="font-mono text-foreground/75">
                      <strong className="text-foreground">{item.count}</strong>{" "}
                      ({pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-background ring-1 ring-ue-border/60">
                    <div
                      className={`h-full rounded-full transition-all ${item.barClass}`}
                      style={{
                        width: item.count > 0 ? `${Math.max(pct, 6)}%` : "0%",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl border border-ue-border bg-background p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">
                Estado de contraseñas institucionales
              </span>
              <span className="font-bold text-blue-700">
                {data.updatedPasswordCount} de {data.totalUsers} seguras
              </span>
            </div>
            <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-amber-200">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${data.securityAdoptionPct}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-ue-gray">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                Clave actualizada ({data.updatedPasswordCount})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Pendiente primer cambio ({data.pendingPasswordCount})
              </span>
            </div>
          </div>
        </div>

        {/* Taxonomía Documental y Niveles de Acceso */}
        <div className="rounded-3xl border border-ue-border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-foreground">
                Taxonomía Documental y Confidencialidad
              </h3>
              <p className="text-xs text-foreground/60">
                Tipos documentales configurados y volumen clasificado por IA
              </p>
            </div>
            <span className="rounded-full bg-background px-2.5 py-1 text-xs font-semibold text-ue-crimson border border-ue-border">
              {data.documentTypes.length} categorías
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {data.documentTypes.map((dt) => {
              const badge = ACCESS_BADGE[dt.accessLevel];
              const barWidth =
                dt.documentCount > 0
                  ? Math.max(
                      Math.round((dt.documentCount / maxDocCount) * 100),
                      8
                    )
                  : 0;

              return (
                <div
                  key={dt.id}
                  className="rounded-xl border border-ue-border/75 bg-background/70 px-3.5 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate font-semibold text-foreground">
                        {dt.name}
                      </span>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-bold text-ue-crimson">
                      {dt.documentCount}{" "}
                      <span className="font-sans font-normal text-ue-gray">
                        {dt.documentCount === 1 ? "doc" : "docs"}
                      </span>
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white ring-1 ring-ue-border/50">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-ue-crimson to-ue-gold transition-all"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Bitácora de Auditoría en Vivo + Centro de Alertas Directivas */}
      <section className="grid gap-5 lg:grid-cols-12">
        {/* Bitácora de Auditoría */}
        <div className="rounded-3xl border border-ue-border bg-white p-6 shadow-sm lg:col-span-8">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ue-crimson-soft text-ue-crimson">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Bitácora de Auditoría Reciente
                </h3>
                <p className="text-xs text-foreground/60">
                  Últimos eventos registrados automáticamente en el sistema
                </p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-600/20">
              En vivo
            </span>
          </div>

          <div className="mt-4 max-h-[300px] overflow-y-auto overflow-x-auto pr-1">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-ue-border uppercase tracking-wider text-ue-gray">
                  <th className="py-2.5 pr-3 font-semibold">Evento</th>
                  <th className="py-2.5 pr-3 font-semibold">Usuario</th>
                  <th className="py-2.5 pr-3 font-semibold">Detalle</th>
                  <th className="py-2.5 text-right font-semibold">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ue-border/60">
                {data.recentAuditEvents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-sm text-ue-gray"
                    >
                      Aún no existen eventos registrados en la bitácora.
                    </td>
                  </tr>
                ) : (
                  data.recentAuditEvents.map((ev) => {
                    const meta = AUDIT_ACTION_META[ev.action] ?? {
                      label: ev.action,
                      badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
                    };
                    return (
                      <tr key={ev.id} className="hover:bg-ue-crimson-soft/15">
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
                        <td className="py-2.5 pr-3 text-foreground/75">
                          {ev.detail}
                        </td>
                        <td className="py-2.5 text-right whitespace-nowrap font-mono text-[11px] text-ue-gray">
                          {ev.createdAt}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Centro de Alertas Directivas */}
        <div className="rounded-3xl border border-ue-border bg-white p-6 shadow-sm lg:col-span-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ue-gold-soft text-[#7A5900]">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Alertas Directivas
              </h3>
              <p className="text-xs text-foreground/60">
                Seguridad y cumplimiento normativo
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {data.pendingPasswordCount > 0 ? (
              <div className="rounded-2xl border border-amber-300/80 bg-amber-50/70 p-4">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-xs font-bold text-amber-900">
                      {data.pendingPasswordCount}{" "}
                      {data.pendingPasswordCount === 1
                        ? "cuenta con clave temporal"
                        : "cuentas con clave temporal"}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-amber-800/90">
                      Aún no completan el cambio obligatorio de contraseña en su
                      primer ingreso.
                    </p>
                    <Link
                      href="/panel/rector/usuarios"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-ue-crimson hover:underline"
                    >
                      Ver en Registro de Usuarios
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-600/20 bg-emerald-50/60 p-4">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-xs font-bold text-emerald-900">
                      100% de cuentas protegidas
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-emerald-800/85">
                      Todos los usuarios registrados cuentan con contraseña
                      segura verificada.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {data.lowConfidenceCount > 0 && (
              <div className="rounded-2xl border border-ue-crimson/25 bg-ue-crimson-soft p-4">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-ue-crimson" />
                  <div>
                    <p className="text-xs font-bold text-ue-crimson-deep">
                      {data.lowConfidenceCount} documentos con baja confianza IA
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-ue-crimson-dark/85">
                      Requieren revisión manual de categoría en Secretaría.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!data.geminiConfigured && (
              <div className="rounded-2xl border border-ue-gold-dark/25 bg-ue-gold-soft/75 p-4">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-ue-gold-dark" />
                  <div>
                    <p className="text-xs font-bold text-[#594300]">
                      Motor PLN y Embeddings pendiente
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[#594300]/85">
                      Agrega <code className="font-mono">GEMINI_API_KEY</code>{" "}
                      para activar extracción automática de metadatos y búsqueda
                      vectorial.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-ue-border bg-background p-4">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ue-crimson" />
                <div>
                  <p className="text-xs font-bold text-foreground">
                    Cumplimiento y Trazabilidad
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-foreground/70">
                    Políticas RLS activas sobre {data.documentTypes.length} tipos
                    documentales y almacenamiento privado cifrado en Supabase
                    Storage.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
