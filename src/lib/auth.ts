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
  mustChangePassword: boolean;
}

/**
 * Obtiene el perfil autenticado actual desde Supabase (debe ejecutarse dentro de <Suspense>).
 * Si el usuario debe cambiar su contraseña inicial, redirige automáticamente a /cambiar-clave.
 */
export async function requireAuthenticatedProfile(options?: {
  allowPasswordChangeRequired?: boolean;
}): Promise<AuthenticatedProfile> {
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
    .select("identification, full_name, role, department, must_change_password")
    .eq("id", user.id)
    .maybeSingle();

  const role: UserRole = isValidRole(profile?.role) ? profile.role : "docente";
  const identification =
    profile?.identification || user.email?.split("@")[0] || "—";
  const fullName = profile?.full_name || "Usuario Institucional";
  const department = profile?.department || "General";
  const mustChangePassword = Boolean(profile?.must_change_password);

  if (mustChangePassword && !options?.allowPasswordChangeRequired) {
    redirect("/cambiar-clave");
  }

  return {
    id: user.id,
    identification,
    fullName,
    role,
    department,
    mustChangePassword,
  };
}

/**
 * Garantiza que el usuario autenticado tenga acceso al rol de la pantalla solicitada.
 */
export async function requireRoleAccess(
  targetRole: UserRole
): Promise<AuthenticatedProfile> {
  const profile = await requireAuthenticatedProfile();

  if (profile.role !== targetRole) {
    redirect(getRoleHomePath(profile.role));
  }

  return profile;
}
