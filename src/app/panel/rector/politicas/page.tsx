import { Suspense } from "react";
import { requireRoleAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RoleDashboardShell } from "@/components/RoleDashboardShell";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import {
  PoliciesTaxonomyManager,
  type AccessLevel,
  type TaxonomyCategory,
} from "@/components/PoliciesTaxonomyManager";

async function PoliticasContent() {
  const profile = await requireRoleAccess("rector");
  const supabase = await createClient();

  const [typesRes, docsRes] = await Promise.all([
    supabase
      .from("document_types")
      .select("id, name, description, default_access_level")
      .order("name"),
    supabase.from("documents").select("document_type_id"),
  ]);

  const counts = new Map<string, number>();
  for (const d of docsRes.data ?? []) {
    if (d.document_type_id) {
      counts.set(
        d.document_type_id,
        (counts.get(d.document_type_id) ?? 0) + 1
      );
    }
  }

  const initialCategories: TaxonomyCategory[] = (typesRes.data ?? []).map(
    (dt) => ({
      id: dt.id,
      name: dt.name,
      description: dt.description ?? null,
      default_access_level: dt.default_access_level as AccessLevel,
      documentCount: counts.get(dt.id) ?? 0,
    })
  );

  return (
    <RoleDashboardShell
      roleKey="rector"
      profile={profile}
      activeNav="politicas"
      pageTitle="Políticas y Taxonomía"
    >
      <PoliciesTaxonomyManager initialCategories={initialCategories} />
    </RoleDashboardShell>
  );
}

export default function PoliticasTaxonomiaPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <PoliticasContent />
    </Suspense>
  );
}
