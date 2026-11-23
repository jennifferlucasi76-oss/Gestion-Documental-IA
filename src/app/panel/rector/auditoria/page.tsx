import { Suspense } from "react";
import { requireRoleAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RoleDashboardShell } from "@/components/RoleDashboardShell";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import {
  AuditComplianceWorkspace,
  type AuditLogRow,
} from "@/components/AuditComplianceWorkspace";

const ROLE_LABELS: Record<string, string> = {
  rector: "Rector / Directivo",
  secretaria: "Personal Administrativo",
  coordinador: "Coordinador de Área",
  docente: "Docente",
};

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-EC", {
      timeZone: "America/Guayaquil",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatDetail(
  action: string,
  details: Record<string, unknown> | null
): string {
  if (!details) return "Operación registrada";
  switch (action) {
    case "LOGIN":
      return `Inicio de sesión (C.I. ${String(details.identification ?? "—")})`;
    case "CREATE_USER":
      return `Alta individual • C.I. ${String(details.identification ?? "—")} (${String(details.role ?? "—")})`;
    case "BULK_IMPORT_USERS":
      return `${String(details.file_name ?? "Excel")} • ${Number(details.created_count ?? 0)} creados, ${Number(details.skipped_existing_count ?? 0)} omitidos`;
    case "DELETE_USER":
      return "Eliminación de cuenta institucional";
    case "CHANGE_PASSWORD":
      return "Cambio obligatorio de contraseña inicial a clave segura";
    case "UPLOAD":
      return `${String(details.file_name ?? "Archivo")} → ${String(details.document_type ?? "Clasificado")} (${Math.round(Number(details.confidence_score ?? 0) * 100)}% • ${Number(details.processing_ms ?? 0)} ms)`;
    case "SEARCH":
      return `Consulta: "${String(details.query ?? "")}" (${Number(details.results_count ?? 0)} resultados • ${Number(details.latency_ms ?? 0)} ms)`;
    case "DOWNLOAD":
      return `Descarga segura de ${String(details.file_name ?? "documento")}`;
    case "VERIFY_HASH":
      return details.verified
        ? `Integridad SHA-256 confirmada (${String(details.file_name ?? "archivo")})`
        : `Discrepancia SHA-256 detectada (${String(details.file_name ?? "archivo")})`;
    case "DELETE_DOCUMENT":
      return `Eliminado del repositorio: ${String(details.file_name ?? details.title ?? "documento")}`;
    case "UPDATE_TAXONOMY":
      return `Taxonomía (${String(details.operation ?? "update")}): ${String(details.category_name ?? "—")}`;
    default:
      return JSON.stringify(details);
  }
}

async function AuditoriaContent() {
  const profile = await requireRoleAccess("rector");
  const supabase = await createClient();

  const [logsRes, profilesRes, docsCountRes] = await Promise.all([
    supabase
      .from("audit_logs")
      .select("id, user_id, action, details, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("profiles")
      .select("id, full_name, identification, role, must_change_password"),
    supabase.from("documents").select("id", { count: "exact", head: true }),
  ]);

  const profiles = profilesRes.data ?? [];
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const totalUsers = profiles.length;
  const updatedPasswords = profiles.filter((p) => !p.must_change_password).length;
  const securityAdoptionPct =
    totalUsers > 0 ? Math.round((updatedPasswords / totalUsers) * 100) : 100;

  const logs = logsRes.data ?? [];
  const verifiedEventsCount = logs.filter((l) => l.action === "VERIFY_HASH").length;

  const initialLogs: AuditLogRow[] = logs.map((log) => {
    const actor = log.user_id ? profileMap.get(log.user_id) : undefined;
    return {
      id: log.id,
      action: log.action,
      actorName: actor?.full_name ?? "Sistema",
      actorId: actor?.identification ?? "—",
      actorRole: actor?.role ? (ROLE_LABELS[actor.role] ?? actor.role) : "—",
      detail: formatDetail(
        log.action,
        (log.details as Record<string, unknown> | null) ?? null
      ),
      createdAtIso: log.created_at,
      createdAtLabel: formatDateTime(log.created_at),
    };
  });

  return (
    <RoleDashboardShell
      roleKey="rector"
      profile={profile}
      activeNav="auditoria"
      pageTitle="Cumplimiento y Auditoría"
    >
      <AuditComplianceWorkspace
        totalEvents={logs.length}
        totalDocuments={docsCountRes.count ?? 0}
        verifiedEventsCount={verifiedEventsCount}
        securityAdoptionPct={securityAdoptionPct}
        updatedPasswords={updatedPasswords}
        totalUsers={totalUsers}
        initialLogs={initialLogs}
      />
    </RoleDashboardShell>
  );
}

export default function CumplimientoAuditoriaPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AuditoriaContent />
    </Suspense>
  );
}
