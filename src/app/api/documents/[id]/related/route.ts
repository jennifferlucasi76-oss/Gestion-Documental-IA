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

  // Obtener el embedding representativo del documento (protegido por RLS)
  const { data: vectorRow, error: vecErr } = await supabase
    .from("document_vectors")
    .select("embedding")
    .eq("document_id", id)
    .order("chunk_index", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (vecErr || !vectorRow?.embedding) {
    return NextResponse.json({ related: [] });
  }

  const { data: rpcRows, error: rpcErr } = await supabase.rpc(
    "match_documents",
    {
      query_embedding: vectorRow.embedding,
      match_threshold: 0.25,
      match_count: 6,
      filter_type_id: null,
    }
  );

  if (rpcErr) {
    return NextResponse.json({ error: rpcErr.message }, { status: 500 });
  }

  const related = ((rpcRows ?? []) as Array<Record<string, unknown>>)
    .filter((row) => row.document_id !== id)
    .slice(0, 4);

  return NextResponse.json({ related });
}
