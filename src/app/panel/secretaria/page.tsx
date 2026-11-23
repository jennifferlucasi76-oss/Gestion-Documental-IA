import { Suspense } from "react";
import { requireRoleAccess } from "@/lib/auth";
import { RoleDashboardShell } from "@/components/RoleDashboardShell";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";

async function SecretariaContent() {
  const profile = await requireRoleAccess("secretaria");
  return <RoleDashboardShell roleKey="secretaria" profile={profile} />;
}

export default function SecretariaPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <SecretariaContent />
    </Suspense>
  );
}
