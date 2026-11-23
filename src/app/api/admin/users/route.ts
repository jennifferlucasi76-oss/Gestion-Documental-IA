import { NextResponse, type NextRequest } from "next/server";
import { verifyRectorApiCaller } from "@/lib/supabase/admin";
import { createManagedUser } from "@/lib/admin-users";
import { parseRoleInput } from "@/lib/roles";

export async function GET() {
  const auth = await verifyRectorApiCaller();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.admin
    .from("profiles")
    .select(
      "id, identification, full_name, institutional_email, role, department, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await verifyRectorApiCaller();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Cuerpo de solicitud JSON inválido." },
      { status: 400 }
    );
  }

  const role = parseRoleInput(String(body.role ?? ""));
  if (!role) {
    return NextResponse.json(
      { error: "Selecciona un rol institucional válido." },
      { status: 400 }
    );
  }

  const result = await createManagedUser(auth.admin, {
    fullName: String(body.fullName ?? ""),
    identification: String(body.identification ?? ""),
    institutionalEmail: String(body.institutionalEmail ?? ""),
    role,
    department: body.department ? String(body.department) : undefined,
    password: body.password ? String(body.password) : undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  try {
    await auth.admin.from("audit_logs").insert({
      user_id: auth.userId,
      action: "CREATE_USER",
      details: {
        created_user_id: result.user.id,
        identification: result.user.identification,
        role: result.user.role,
      },
    });
  } catch {
    // No bloquear por bitácora
  }

  return NextResponse.json(
    {
      user: result.user,
      usedDefaultPassword: result.usedDefaultPassword,
    },
    { status: 201 }
  );
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyRectorApiCaller();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const targetId = request.nextUrl.searchParams.get("id")?.trim();
  if (!targetId) {
    return NextResponse.json(
      { error: "Falta el identificador del usuario a eliminar." },
      { status: 400 }
    );
  }

  if (targetId === auth.userId) {
    return NextResponse.json(
      { error: "No puedes eliminar tu propia cuenta administradora activa." },
      { status: 400 }
    );
  }

  const { error } = await auth.admin.auth.admin.deleteUser(targetId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  try {
    await auth.admin.from("audit_logs").insert({
      user_id: auth.userId,
      action: "DELETE_USER",
      details: { deleted_user_id: targetId },
    });
  } catch {
    // No bloquear por bitácora
  }

  return NextResponse.json({ ok: true });
}
