import { Suspense } from "react";
import { requireAuthenticatedProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isAiConfigured } from "@/lib/ai";
import { RoleDashboardShell } from "@/components/RoleDashboardShell";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import {
  SemanticSearchWorkspace,
  type DocTypeFilter,
  type IndexedDocumentItem,
} from "@/components/SemanticSearchWorkspace";

async function BusquedaContent() {
  const profile = await requireAuthenticatedProfile();
  const supabase = await createClient();

  const [typesRes, docsRes] = await Promise.all([
    supabase
      .from("document_types")
      .select("id, name, default_access_level")
      .order("name"),
    supabase
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
        document_types ( name ),
        document_metadata (
          emission_date,
          author,
          origin_department,
          topic,
          keywords,
          summary
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const documentTypes = (typesRes.data ?? []) as DocTypeFilter[];

  const initialDocuments: IndexedDocumentItem[] = (docsRes.data ?? []).map(
    (d) => {
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
        file_size_bytes: Number(d.file_size_bytes ?? 0),
        sha256_hash: d.sha256_hash,
        confidence_score: d.confidence_score ?? null,
        access_level: d.access_level as IndexedDocumentItem["access_level"],
        document_type_name: dt?.name ?? null,
        created_at: d.created_at,
        emission_date: meta?.emission_date ?? null,
        author: meta?.author ?? null,
        origin_department: meta?.origin_department ?? null,
        topic: meta?.topic ?? null,
        keywords: (meta?.keywords as string[] | null) ?? [],
        summary: meta?.summary ?? null,
      };
    }
  );

  return (
    <RoleDashboardShell
      roleKey={profile.role}
      profile={profile}
      activeNav="busqueda"
      pageTitle="Búsqueda Semántica IA"
    >
      <SemanticSearchWorkspace
        userRole={profile.role}
        documentTypes={documentTypes}
        initialDocuments={initialDocuments}
        aiConfigured={isAiConfigured()}
      />
    </RoleDashboardShell>
  );
}

export default function BusquedaSemanticaPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <BusquedaContent />
    </Suspense>
  );
}
