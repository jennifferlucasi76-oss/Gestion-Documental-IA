import { Suspense } from "react";
import { requireRoleAccess } from "@/lib/auth";
import { RoleDashboardShell } from "@/components/RoleDashboardShell";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";

async function RectorContent() {
  const profile = await requireRoleAccess("rector");
  return <RoleDashboardShell roleKey="rector" profile={profile} />;
}

export default function RectorPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <RectorContent />
    </Suspense>
  );
}
