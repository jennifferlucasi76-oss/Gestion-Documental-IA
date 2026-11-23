import { Suspense } from "react";
import { requireRoleAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RoleDashboardShell } from "@/components/RoleDashboardShell";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import {
  RectorExecutiveDashboard,
  type AuditEventItem,
  type DocumentTypeSummary,
  type RectorDashboardData,
  type RoleDistributionItem,
} from "@/components/RectorExecutiveDashboard";
import type { UserRole } from "@/lib/roles";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatAuditDetail(
  action: string,
  details: Record<string, unknown> | null
): string {
  if (!details) return "Operación registrada";
  if (action === "LOGIN") {
    return `Acceso verificado (C.I. ${String(details.identification ?? "—")})`;
  }
  if (action === "CREATE_USER") {
    return `Alta individual • C.I. ${String(details.identification ?? "—")} (${String(details.role ?? "—")})`;
  }
  if (action === "BULK_IMPORT_USERS") {
    const created = Number(details.created_count ?? 0);
    const skipped = Number(details.skipped_existing_count ?? 0);
    return `${String(details.file_name ?? "Excel")} • ${created} creados${skipped > 0 ? `, ${skipped} omitidos` : ""}`;
  }
  if (action === "CHANGE_PASSWORD") {
    return "Actualizó contraseña inicial a clave segura";
  }
  if (action === "DELETE_USER") {
    return "Cuenta institucional eliminada por administración";
  }
  return "Evento registrado en bitácora";
}

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-EC", {
      timeZone: "America/Guayaquil",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

async function RectorContent() {
  const profile = await requireRoleAccess("rector");
  const supabase = await createClient();

  const [profilesRes, typesRes, docsRes, auditRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, identification, role, must_change_password"),
    supabase
      .from("document_types")
      .select("id, name, default_access_level")
      .order("name"),
    supabase
      .from("documents")
      .select("id, document_type_id, file_size_bytes, confidence_score"),
    supabase
      .from("audit_logs")
      .select("id, user_id, action, details, created_at")
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  const profiles = profilesRes.data ?? [];
  const docTypes = typesRes.data ?? [];
  const documents = docsRes.data ?? [];
  const auditLogs = auditRes.data ?? [];

  const totalUsers = profiles.length;
  const pendingPasswordCount = profiles.filter(
    (p) => p.must_change_password
  ).length;
  const updatedPasswordCount = totalUsers - pendingPasswordCount;
  const securityAdoptionPct =
    totalUsers > 0 ? Math.round((updatedPasswordCount / totalUsers) * 100) : 100;

  const roleCounts: Record<UserRole, number> = {
    rector: 0,
    secretaria: 0,
    docente: 0,
    coordinador: 0,
  };
  const profileById = new Map<
    string,
    { full_name: string; identification: string }
  >();

  for (const p of profiles) {
    profileById.set(p.id, {
      full_name: p.full_name || "Usuario",
      identification: p.identification || "—",
    });
    if (p.role in roleCounts) {
      roleCounts[p.role as UserRole] += 1;
    }
  }

  const roleDistribution: RoleDistributionItem[] = [
    {
      role: "rector",
      label: "Rector / Equipo Directivo",
      count: roleCounts.rector,
      barClass: "bg-ue-crimson",
      dotClass: "bg-ue-crimson",
    },
    {
      role: "secretaria",
      label: "Personal Administrativo",
      count: roleCounts.secretaria,
      barClass: "bg-ue-gold-dark",
      dotClass: "bg-ue-gold",
    },
    {
      role: "coordinador",
      label: "Coordinador de Área",
      count: roleCounts.coordinador,
      barClass: "bg-ue-crimson-deep",
      dotClass: "bg-ue-crimson-deep",
    },
    {
      role: "docente",
      label: "Docente",
      count: roleCounts.docente,
      barClass: "bg-slate-600",
      dotClass: "bg-slate-500",
    },
  ];

  const docCountByType = new Map<string, number>();
  let totalBytes = 0;
  let confidenceSum = 0;
  let confidenceCount = 0;
  let lowConfidenceCount = 0;

  for (const d of documents) {
    if (d.document_type_id) {
      docCountByType.set(
        d.document_type_id,
        (docCountByType.get(d.document_type_id) ?? 0) + 1
      );
    }
    totalBytes += Number(d.file_size_bytes ?? 0);
    if (typeof d.confidence_score === "number") {
      confidenceSum += d.confidence_score;
      confidenceCount += 1;
      if (d.confidence_score < 0.75) {
        lowConfidenceCount += 1;
      }
    }
  }

  const documentTypes: DocumentTypeSummary[] = docTypes.map((dt) => ({
    id: dt.id,
    name: dt.name,
    accessLevel: dt.default_access_level as DocumentTypeSummary["accessLevel"],
    documentCount: docCountByType.get(dt.id) ?? 0,
  }));

  const recentAuditEvents: AuditEventItem[] = auditLogs.map((log) => {
    const actor = log.user_id ? profileById.get(log.user_id) : undefined;
    return {
      id: log.id,
      action: log.action,
      actorName: actor?.full_name ?? "Sistema",
      actorId: actor?.identification ?? "—",
      detail: formatAuditDetail(
        log.action,
        (log.details as Record<string, unknown> | null) ?? null
      ),
      createdAt: formatDateTime(log.created_at),
    };
  });

  const dateLabel = new Intl.DateTimeFormat("es-EC", {
    timeZone: "America/Guayaquil",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const dashboardData: RectorDashboardData = {
    dateLabel: dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    totalUsers,
    updatedPasswordCount,
    pendingPasswordCount,
    securityAdoptionPct,
    roleDistribution,
    totalDocuments: documents.length,
    storageLabel: formatBytes(totalBytes),
    avgConfidencePct:
      confidenceCount > 0
        ? Math.round((confidenceSum / confidenceCount) * 100)
        : null,
    lowConfidenceCount,
    documentTypes,
    recentAuditEvents,
  };

  return (
    <RoleDashboardShell roleKey="rector" profile={profile} activeNav="home">
      <RectorExecutiveDashboard data={dashboardData} />
    </RoleDashboardShell>
  );
}

export default function RectorPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <RectorContent />
    </Suspense>
  );
}
