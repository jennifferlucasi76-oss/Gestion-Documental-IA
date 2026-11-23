import { Suspense } from "react";
import { requireRoleAccess } from "@/lib/auth";
import { RoleDashboardShell } from "@/components/RoleDashboardShell";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";

async function CoordinadorContent() {
  const profile = await requireRoleAccess("coordinador");
  return <RoleDashboardShell roleKey="coordinador" profile={profile} />;
}

export default function CoordinadorPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <CoordinadorContent />
    </Suspense>
  );
}
