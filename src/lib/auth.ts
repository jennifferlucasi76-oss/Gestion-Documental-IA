import "server-only";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  getRoleHomePath,
  isValidRole,
  type UserRole,
} from "@/lib/roles";

export interface AuthenticatedProfile {
  id: string;
  identification: string;
  fullName: string;
  role: UserRole;
  department: string;
}

/**
 * Obtiene el perfil autenticado actual desde Supabase (debe ejecutarse dentro de <Suspense>).
 */
export async function requireAuthenticatedProfile(): Promise<AuthenticatedProfile> {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("identification, full_name, role, department")
    .eq("id", user.id)
    .maybeSingle();

  const role: UserRole = isValidRole(profile?.role) ? profile.role : "docente";
  const identification =
    profile?.identification || user.email?.split("@")[0] || "—";
  const fullName = profile?.full_name || "Usuario Institucional";
  const department = profile?.department || "General";

  return {
    id: user.id,
    identification,
    fullName,
    role,
    department,
  };
}

/**
 * Garantiza que el usuario autenticado tenga acceso al rol de la pantalla solicitada.
 * El rol Rector (administrador) puede visualizar todos los paneles de rol.
 */
export async function requireRoleAccess(
  targetRole: UserRole
): Promise<AuthenticatedProfile> {
  const profile = await requireAuthenticatedProfile();

  if (profile.role !== "rector" && profile.role !== targetRole) {
    redirect(getRoleHomePath(profile.role));
  }

  return profile;
}
