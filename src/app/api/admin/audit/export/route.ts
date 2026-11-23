import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { verifyRectorApiCaller } from "@/lib/supabase/admin";

function formatDateEc(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-EC", {
      timeZone: "America/Guayaquil",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export async function GET() {
  const auth = await verifyRectorApiCaller();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [logsRes, profilesRes, docsRes] = await Promise.all([
    auth.admin
      .from("audit_logs")
      .select("id, user_id, action, document_id, details, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    auth.admin
      .from("profiles")
      .select("id, full_name, identification, role"),
    auth.admin
      .from("documents")
      .select(
        "id, title, file_name, file_type, access_level, sha256_hash, confidence_score, created_at, document_types(name)"
      )
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const profileMap = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, p])
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Unidad Educativa San José - SGDI-IA";
  workbook.created = new Date();

  // =========================================================================
  // HOJA 1: BITÁCORA DE AUDITORÍA
  // =========================================================================
  const auditSheet = workbook.addWorksheet("Bitácora de Auditoría", {
    views: [{ state: "frozen", ySplit: 4, showGridLines: false }],
  });

  auditSheet.columns = [
    { width: 22 },
    { width: 22 },
    { width: 28 },
    { width: 16 },
    { width: 18 },
    { width: 52 },
  ];

  auditSheet.mergeCells("A1:F1");
  const title = auditSheet.getCell("A1");
  title.value =
    "UNIDAD EDUCATIVA SAN JOSÉ — REPORTE DE CUMPLIMIENTO Y AUDITORÍA (SGDI-IA)";
  title.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF981018" } };
  title.alignment = { vertical: "middle", horizontal: "left" };
  auditSheet.getRow(1).height = 28;

  auditSheet.mergeCells("A2:F2");
  const sub = auditSheet.getCell("A2");
  sub.value = `Generado el ${formatDateEc(new Date().toISOString())} (Ecuador) • Trazabilidad institucional para control interno y Ministerio de Educación`;
  sub.font = { name: "Calibri", size: 9.5, italic: true, color: { argb: "FF594300" } };
  sub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8D000" } };
  sub.alignment = { vertical: "middle", horizontal: "left" };
  auditSheet.getRow(2).height = 20;

  const headers = [
    "Fecha y Hora",
    "Acción",
    "Usuario",
    "Cédula",
    "Rol",
    "Detalle del Evento",
  ];
  const hRow = auditSheet.getRow(4);
  hRow.height = 24;
  headers.forEach((text, i) => {
    const cell = hRow.getCell(i + 1);
    cell.value = text;
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7A0C13" } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
  });

  (logsRes.data ?? []).forEach((log, idx) => {
    const actor = log.user_id ? profileMap.get(log.user_id) : undefined;
    const row = auditSheet.getRow(5 + idx);
    row.height = 21;
    const values = [
      formatDateEc(log.created_at),
      log.action,
      actor?.full_name ?? "Sistema",
      actor?.identification ?? "—",
      actor?.role ?? "—",
      JSON.stringify(log.details ?? {}),
    ];
    values.forEach((v, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.value = v;
      cell.font = { name: "Calibri", size: 9.5, color: { argb: "FF1F1718" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: idx % 2 === 1 ? "FFFDF7F7" : "FFFFFFFF" },
      };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFEADCDF" } },
      };
    });
  });

  // =========================================================================
  // HOJA 2: INVENTARIO E INTEGRIDAD DOCUMENTAL (SHA-256)
  // =========================================================================
  const invSheet = workbook.addWorksheet("Inventario SHA-256", {
    views: [{ state: "frozen", ySplit: 4, showGridLines: false }],
  });

  invSheet.columns = [
    { width: 34 },
    { width: 28 },
    { width: 18 },
    { width: 15 },
    { width: 14 },
    { width: 66 },
    { width: 22 },
  ];

  invSheet.mergeCells("A1:G1");
  const invTitle = invSheet.getCell("A1");
  invTitle.value =
    "INVENTARIO DOCUMENTAL Y HUELLAS CRIPTOGRÁFICAS SHA-256 — UE SAN JOSÉ";
  invTitle.font = { name: "Calibri", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  invTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF981018" } };
  invTitle.alignment = { vertical: "middle", horizontal: "left" };
  invSheet.getRow(1).height = 28;

  const invGold = invSheet.getRow(2);
  invGold.height = 5;
  for (let c = 1; c <= 7; c++) {
    invGold.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8D000" } };
  }

  const invHeaders = [
    "Título",
    "Archivo Original",
    "Tipo Documental",
    "Nivel Acceso",
    "Confianza IA",
    "Hash SHA-256",
    "Fecha Registro",
  ];
  const invHRow = invSheet.getRow(4);
  invHRow.height = 24;
  invHeaders.forEach((text, i) => {
    const cell = invHRow.getCell(i + 1);
    cell.value = text;
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7A0C13" } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
  });

  (docsRes.data ?? []).forEach((doc, idx) => {
    const dt = Array.isArray(doc.document_types)
      ? doc.document_types[0]
      : doc.document_types;
    const row = invSheet.getRow(5 + idx);
    row.height = 21;
    const values = [
      doc.title,
      doc.file_name,
      dt?.name ?? "Sin clasificar",
      doc.access_level,
      typeof doc.confidence_score === "number"
        ? `${Math.round(doc.confidence_score * 100)}%`
        : "—",
      doc.sha256_hash,
      formatDateEc(doc.created_at),
    ];
    values.forEach((v, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.value = v;
      cell.font = { name: "Calibri", size: 9.5, color: { argb: "FF1F1718" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: idx % 2 === 1 ? "FFFDF7F7" : "FFFFFFFF" },
      };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFEADCDF" } },
      };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Reporte_Auditoria_UE_San_Jose_${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
