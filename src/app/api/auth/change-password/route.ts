import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluatePassword } from "@/lib/password-policy";
import { getRoleHomePath, isValidRole, type UserRole } from "@/lib/roles";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sesión no válida. Inicia sesión nuevamente." },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Solicitud inválida." },
      { status: 400 }
    );
  }

  const newPassword = String(body.newPassword ?? "");
  const confirmPassword = String(body.confirmPassword ?? "");

  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { error: "Las contraseñas no coinciden." },
      { status: 400 }
    );
  }

  const evaluation = evaluatePassword(newPassword);
  if (!evaluation.isValid) {
    return NextResponse.json(
      {
        error:
          "La contraseña debe tener mínimo 8 caracteres e incluir mayúsculas, minúsculas, números y símbolos.",
      },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("identification, role")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profile?.identification &&
    newPassword.trim() === profile.identification.trim()
  ) {
    return NextResponse.json(
      {
        error:
          "La nueva contraseña no puede ser igual a tu número de cédula.",
      },
      { status: 400 }
    );
  }

  const { error: updateAuthErr } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateAuthErr) {
    return NextResponse.json(
      { error: updateAuthErr.message || "No se pudo actualizar la contraseña." },
      { status: 400 }
    );
  }

  const { error: updateProfileErr } = await admin
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id);

  if (updateProfileErr) {
    return NextResponse.json(
      {
        error:
          "Se cambió la contraseña pero no se pudo actualizar el estado del perfil.",
      },
      { status: 500 }
    );
  }

  try {
    await admin.from("audit_logs").insert({
      user_id: user.id,
      action: "CHANGE_PASSWORD",
      details: { first_login_enforced: true },
    });
  } catch {
    // No bloquear por bitácora
  }

  const role: UserRole = isValidRole(profile?.role) ? profile.role : "docente";

  return NextResponse.json({
    ok: true,
    redirectTo: getRoleHomePath(role),
  });
}
