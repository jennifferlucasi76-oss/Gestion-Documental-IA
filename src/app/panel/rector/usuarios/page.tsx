import { Suspense } from "react";
import { requireRoleAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RoleDashboardShell } from "@/components/RoleDashboardShell";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import {
  UserRegistrationManager,
  type DirectoryUser,
} from "@/components/UserRegistrationManager";

async function UsuariosContent() {
  const profile = await requireRoleAccess("rector");
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select(
      "id, identification, full_name, institutional_email, role, department, created_at"
    )
    .order("created_at", { ascending: false });

  const initialUsers = (data ?? []) as DirectoryUser[];

  return (
    <RoleDashboardShell
      roleKey="rector"
      profile={profile}
      activeNav="usuarios"
      pageTitle="Registro de Usuarios"
    >
      <UserRegistrationManager
        initialUsers={initialUsers}
        currentUserId={profile.id}
      />
    </RoleDashboardShell>
  );
}

export default function RegistroUsuariosPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <UsuariosContent />
    </Suspense>
  );
}
