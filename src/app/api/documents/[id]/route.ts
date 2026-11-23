import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "rector" && profile?.role !== "secretaria") {
    return NextResponse.json(
      { error: "No tienes permisos para eliminar documentos del repositorio." },
      { status: 403 }
    );
  }

  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .select("id, title, file_name, storage_path")
    .eq("id", id)
    .maybeSingle();

  if (docErr || !doc) {
    return NextResponse.json(
      { error: "Documento no encontrado." },
      { status: 404 }
    );
  }

  // 1. Eliminar archivo físico del bucket privado en Supabase Storage
  const { error: storageErr } = await supabase.storage
    .from("documentos")
    .remove([doc.storage_path]);

  if (storageErr) {
    return NextResponse.json(
      {
        error: `No se pudo eliminar el archivo de Storage: ${storageErr.message}`,
      },
      { status: 500 }
    );
  }

  // 2. Eliminar registro en public.documents (en cascada borra document_metadata y document_vectors)
  const { error: deleteErr } = await supabase
    .from("documents")
    .delete()
    .eq("id", doc.id);

  if (deleteErr) {
    return NextResponse.json(
      {
        error: `No se pudo eliminar el documento de la base de datos: ${deleteErr.message}`,
      },
      { status: 500 }
    );
  }

  // 3. Registrar trazabilidad en bitácora
  try {
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "DELETE_DOCUMENT",
      details: {
        deleted_document_id: doc.id,
        title: doc.title,
        file_name: doc.file_name,
      },
    });
  } catch {
    // No bloquear respuesta por bitácora
  }

  return NextResponse.json({ ok: true });
}
