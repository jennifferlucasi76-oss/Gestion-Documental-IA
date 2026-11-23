import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeSha256 } from "@/lib/security";

export async function POST(
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
    .select("id, file_name, storage_path, sha256_hash")
    .eq("id", id)
    .maybeSingle();

  if (docErr || !doc) {
    return NextResponse.json(
      { error: "Documento no encontrado o sin permisos de acceso." },
      { status: 404 }
    );
  }

  const { data: blob, error: dlErr } = await supabase.storage
    .from("documentos")
    .download(doc.storage_path);

  if (dlErr || !blob) {
    return NextResponse.json(
      { error: "No se pudo leer el archivo desde el almacenamiento privado." },
      { status: 500 }
    );
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  const computedHash = computeSha256(buffer);
  const verified = computedHash === doc.sha256_hash;

  try {
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "VERIFY_HASH",
      document_id: doc.id,
      details: {
        file_name: doc.file_name,
        verified,
      },
    });
  } catch {
    // No bloquear verificación por bitácora
  }

  return NextResponse.json({
    verified,
    storedHash: doc.sha256_hash,
    computedHash,
  });
}
