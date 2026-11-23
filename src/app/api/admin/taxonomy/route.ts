import { NextResponse, type NextRequest } from "next/server";
import { verifyRectorApiCaller } from "@/lib/supabase/admin";

const VALID_ACCESS_LEVELS = new Set(["publico", "interno", "confidencial"]);

export async function GET() {
  const auth = await verifyRectorApiCaller();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [typesRes, docsRes] = await Promise.all([
    auth.admin
      .from("document_types")
      .select("id, name, description, default_access_level, created_at")
      .order("name"),
    auth.admin.from("documents").select("document_type_id"),
  ]);

  if (typesRes.error) {
    return NextResponse.json({ error: typesRes.error.message }, { status: 500 });
  }

  const counts = new Map<string, number>();
  for (const d of docsRes.data ?? []) {
    if (d.document_type_id) {
      counts.set(
        d.document_type_id,
        (counts.get(d.document_type_id) ?? 0) + 1
      );
    }
  }

  const categories = (typesRes.data ?? []).map((item) => ({
    ...item,
    documentCount: counts.get(item.id) ?? 0,
  }));

  return NextResponse.json({ categories });
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
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const description = String(body.description ?? "").trim();
  const defaultAccessLevel = String(body.defaultAccessLevel ?? "interno").trim();

  if (name.length < 2 || name.length > 60) {
    return NextResponse.json(
      { error: "El nombre de la categoría debe tener entre 2 y 60 caracteres." },
      { status: 400 }
    );
  }

  if (description.length < 10) {
    return NextResponse.json(
      {
        error:
          "Incluye una descripción clara (mínimo 10 caracteres) para orientar al clasificador de IA.",
      },
      { status: 400 }
    );
  }

  if (!VALID_ACCESS_LEVELS.has(defaultAccessLevel)) {
    return NextResponse.json(
      { error: "Nivel de acceso por defecto no válido." },
      { status: 400 }
    );
  }

  const { data, error } = await auth.admin
    .from("document_types")
    .insert({
      name,
      description,
      default_access_level: defaultAccessLevel,
    })
    .select("id, name, description, default_access_level, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: `Ya existe una categoría documental llamada "${name}".` },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  try {
    await auth.admin.from("audit_logs").insert({
      user_id: auth.userId,
      action: "UPDATE_TAXONOMY",
      details: {
        operation: "create",
        category_name: data.name,
        access_level: data.default_access_level,
      },
    });
  } catch {
    // No bloquear por bitácora
  }

  return NextResponse.json(
    { category: { ...data, documentCount: 0 } },
    { status: 201 }
  );
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyRectorApiCaller();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const id = String(body.id ?? "").trim();
  const name = String(body.name ?? "").trim();
  const description = String(body.description ?? "").trim();
  const defaultAccessLevel = String(body.defaultAccessLevel ?? "").trim();

  if (!id) {
    return NextResponse.json(
      { error: "Falta el identificador de la categoría." },
      { status: 400 }
    );
  }

  if (name.length < 2 || name.length > 60) {
    return NextResponse.json(
      { error: "El nombre debe tener entre 2 y 60 caracteres." },
      { status: 400 }
    );
  }

  if (description.length < 10) {
    return NextResponse.json(
      { error: "La descripción debe tener al menos 10 caracteres." },
      { status: 400 }
    );
  }

  if (!VALID_ACCESS_LEVELS.has(defaultAccessLevel)) {
    return NextResponse.json(
      { error: "Nivel de acceso no válido." },
      { status: 400 }
    );
  }

  const { data, error } = await auth.admin
    .from("document_types")
    .update({
      name,
      description,
      default_access_level: defaultAccessLevel,
    })
    .eq("id", id)
    .select("id, name, description, default_access_level, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: `Ya existe otra categoría llamada "${name}".` },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  try {
    await auth.admin.from("audit_logs").insert({
      user_id: auth.userId,
      action: "UPDATE_TAXONOMY",
      details: {
        operation: "update",
        category_name: data.name,
        access_level: data.default_access_level,
      },
    });
  } catch {
    // No bloquear por bitácora
  }

  return NextResponse.json({ category: data });
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyRectorApiCaller();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json(
      { error: "Falta el identificador de la categoría a eliminar." },
      { status: 400 }
    );
  }

  const { data: existing } = await auth.admin
    .from("document_types")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json(
      { error: "Categoría no encontrada." },
      { status: 404 }
    );
  }

  const { error } = await auth.admin
    .from("document_types")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  try {
    await auth.admin.from("audit_logs").insert({
      user_id: auth.userId,
      action: "UPDATE_TAXONOMY",
      details: {
        operation: "delete",
        category_name: existing.name,
      },
    });
  } catch {
    // No bloquear por bitácora
  }

  return NextResponse.json({ ok: true });
}
