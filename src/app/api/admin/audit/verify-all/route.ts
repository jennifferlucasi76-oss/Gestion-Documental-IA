import { NextResponse } from "next/server";
import { verifyRectorApiCaller } from "@/lib/supabase/admin";
import { computeSha256 } from "@/lib/security";

export interface BatchVerifyItem {
  id: string;
  title: string;
  fileName: string;
  storedHash: string;
  computedHash: string | null;
  status: "verified" | "mismatch" | "missing";
}

export async function POST() {
  const auth = await verifyRectorApiCaller();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: docs, error } = await auth.admin
    .from("documents")
    .select("id, title, file_name, storage_path, sha256_hash")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: BatchVerifyItem[] = [];

  for (const doc of docs ?? []) {
    const { data: blob, error: dlErr } = await auth.admin.storage
      .from("documentos")
      .download(doc.storage_path);

    if (dlErr || !blob) {
      results.push({
        id: doc.id,
        title: doc.title,
        fileName: doc.file_name,
        storedHash: doc.sha256_hash,
        computedHash: null,
        status: "missing",
      });
      continue;
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    const computedHash = computeSha256(buffer);
    const verified = computedHash === doc.sha256_hash;

    results.push({
      id: doc.id,
      title: doc.title,
      fileName: doc.file_name,
      storedHash: doc.sha256_hash,
      computedHash,
      status: verified ? "verified" : "mismatch",
    });

    try {
      await auth.admin.from("audit_logs").insert({
        user_id: auth.userId,
        action: "VERIFY_HASH",
        document_id: doc.id,
        details: {
          file_name: doc.file_name,
          verified,
          batch_audit: true,
        },
      });
    } catch {
      // No bloquear auditoría masiva por bitácora
    }
  }

  const verifiedCount = results.filter((r) => r.status === "verified").length;
  const issueCount = results.length - verifiedCount;

  return NextResponse.json({
    totalChecked: results.length,
    verifiedCount,
    issueCount,
    checkedAt: new Date().toISOString(),
    results,
  });
}
