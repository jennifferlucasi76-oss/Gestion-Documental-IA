import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireAuthenticatedProfile } from "@/lib/auth";
import { getRoleHomePath } from "@/lib/roles";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";

async function RoleRedirect(): Promise<never> {
  const profile = await requireAuthenticatedProfile();
  redirect(getRoleHomePath(profile.role));
}

export default function Home() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <RoleRedirect />
    </Suspense>
  );
}
