import { Suspense } from "react";
import { requireRoleAccess } from "@/lib/auth";
import { RoleDashboardShell } from "@/components/RoleDashboardShell";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";

async function DocenteContent() {
  const profile = await requireRoleAccess("docente");
  return <RoleDashboardShell roleKey="docente" profile={profile} />;
}

export default function DocentePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DocenteContent />
    </Suspense>
  );
}
