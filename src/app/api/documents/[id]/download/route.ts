import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
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

  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .select("id, file_name, storage_path")
    .eq("id", id)
    .maybeSingle();

  if (docErr || !doc) {
    return NextResponse.json(
      { error: "Documento no encontrado o sin permisos de acceso." },
      { status: 404 }
    );
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from("documentos")
    .createSignedUrl(doc.storage_path, 60, {
      download: doc.file_name,
    });

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json(
      { error: "No se pudo generar el enlace seguro de descarga." },
      { status: 500 }
    );
  }

  try {
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "DOWNLOAD",
      document_id: doc.id,
      details: { file_name: doc.file_name },
    });
  } catch {
    // No bloquear descarga por bitácora
  }

  return NextResponse.redirect(signed.signedUrl);
}
