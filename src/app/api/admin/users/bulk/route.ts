import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { verifyRectorApiCaller } from "@/lib/supabase/admin";
import {
  createManagedUser,
  normalizeIdentification,
  validateUserFields,
} from "@/lib/admin-users";
import { parseRoleInput, type UserRole } from "@/lib/roles";

const MAX_EXCEL_BYTES = 5 * 1024 * 1024; // 5 MB

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\*/g, "")
    .trim();
}

function readCellText(cell: ExcelJS.Cell): string {
  const val = cell.value;
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val.trim();
  if (typeof val === "number") return String(val).trim();
  if (typeof val === "object") {
    if ("text" in val && typeof val.text === "string") {
      return val.text.trim();
    }
    if ("richText" in val && Array.isArray(val.richText)) {
      return val.richText
        .map((part) => (typeof part.text === "string" ? part.text : ""))
        .join("")
        .trim();
    }
    if ("result" in val && val.result !== undefined && val.result !== null) {
      return String(val.result).trim();
    }
  }
  return String(val).trim();
}

interface AnalyzedExcelRow {
  rowNumber: number;
  fullName: string;
  identification: string;
  institutionalEmail: string;
  role: UserRole | null;
  rawRole: string;
  status: "valid_new" | "existing" | "invalid";
  message: string;
}

interface ImportRowResult {
  rowNumber: number;
  fullName: string;
  identification: string;
  institutionalEmail: string;
  role: UserRole | null;
  status: "created" | "skipped" | "error";
  message: string;
}

export async function POST(request: NextRequest) {
  const auth = await verifyRectorApiCaller();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Envía el archivo Excel mediante multipart/form-data." },
      { status: 400 }
    );
  }

  const dryRun = String(formData.get("dryRun") ?? "") === "true";
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Selecciona un archivo Excel (.xlsx)." },
      { status: 400 }
    );
  }

  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return NextResponse.json(
      { error: "Formato no permitido. Sube el archivo oficial en formato .xlsx." },
      { status: 400 }
    );
  }

  if (file.size <= 0 || file.size > MAX_EXCEL_BYTES) {
    return NextResponse.json(
      { error: "El archivo está vacío o supera el tamaño máximo de 5 MB." },
      { status: 400 }
    );
  }

  const workbook = new ExcelJS.Workbook();
  try {
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);
  } catch {
    return NextResponse.json(
      { error: "No se pudo leer el archivo .xlsx. Verifica que no esté dañado." },
      { status: 400 }
    );
  }

  const sheet =
    workbook.getWorksheet("Registro de Usuarios") ?? workbook.worksheets[0];

  if (!sheet) {
    return NextResponse.json(
      { error: "El archivo Excel no contiene hojas válidas." },
      { status: 400 }
    );
  }

  let headerRowNumber = -1;
  const colIndex = {
    fullName: -1,
    identification: -1,
    institutionalEmail: -1,
    role: -1,
  };

  const maxScan = Math.min(sheet.rowCount, 15);
  for (let r = 1; r <= maxScan; r++) {
    const row = sheet.getRow(r);
    const temp = { ...colIndex };
    row.eachCell((cell, colNum) => {
      const h = normalizeHeader(readCellText(cell));
      if (h.includes("nombre")) temp.fullName = colNum;
      else if (h.includes("cedula") || h.includes("identificacion"))
        temp.identification = colNum;
      else if (h.includes("correo") || h.includes("email"))
        temp.institutionalEmail = colNum;
      else if (h === "rol" || h.startsWith("rol ")) temp.role = colNum;
    });

    if (
      temp.fullName > 0 &&
      temp.identification > 0 &&
      temp.institutionalEmail > 0 &&
      temp.role > 0
    ) {
      headerRowNumber = r;
      Object.assign(colIndex, temp);
      break;
    }
  }

  if (headerRowNumber === -1) {
    return NextResponse.json(
      {
        error:
          "No se encontraron las columnas obligatorias (Nombres Completos, Cédula, Correo Institucional, Rol). Descarga y usa el formato oficial.",
      },
      { status: 400 }
    );
  }

  // Obtener todas las cédulas ya registradas en el sistema en una sola consulta
  const { data: existingProfiles, error: existingErr } = await auth.admin
    .from("profiles")
    .select("identification");

  if (existingErr) {
    return NextResponse.json(
      { error: "No se pudo verificar los usuarios existentes en el sistema." },
      { status: 500 }
    );
  }

  const existingIds = new Set(
    (existingProfiles ?? [])
      .map((p) => (p.identification ? normalizeIdentification(p.identification) : ""))
      .filter(Boolean)
  );

  const seenInFile = new Map<string, number>();
  const analyzedRows: AnalyzedExcelRow[] = [];

  for (let r = headerRowNumber + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const fullName = readCellText(row.getCell(colIndex.fullName));
    const identification = normalizeIdentification(
      readCellText(row.getCell(colIndex.identification))
    );
    const institutionalEmail = readCellText(
      row.getCell(colIndex.institutionalEmail)
    ).toLowerCase();
    const rawRole = readCellText(row.getCell(colIndex.role));

    // Ignorar filas vacías (solo tienen índice N° prellenado)
    if (!fullName && !identification && !institutionalEmail && !rawRole) {
      continue;
    }

    const parsedRole = parseRoleInput(rawRole);
    const errors = validateUserFields({
      fullName,
      identification,
      institutionalEmail,
      role: parsedRole,
      rawRole,
    });

    if (identification && seenInFile.has(identification)) {
      errors.push(
        `Cédula repetida dentro del documento (ya aparece en la fila ${seenInFile.get(
          identification
        )}).`
      );
    } else if (identification) {
      seenInFile.set(identification, r);
    }

    if (errors.length > 0) {
      analyzedRows.push({
        rowNumber: r,
        fullName,
        identification,
        institutionalEmail,
        role: parsedRole,
        rawRole,
        status: "invalid",
        message: errors.join(" "),
      });
      continue;
    }

    if (existingIds.has(identification)) {
      analyzedRows.push({
        rowNumber: r,
        fullName,
        identification,
        institutionalEmail,
        role: parsedRole,
        rawRole,
        status: "existing",
        message: "Ya existe en el sistema (se omitirá sin alterar).",
      });
      continue;
    }

    analyzedRows.push({
      rowNumber: r,
      fullName,
      identification,
      institutionalEmail,
      role: parsedRole,
      rawRole,
      status: "valid_new",
      message: "Válido — listo para registrar.",
    });
  }

  if (analyzedRows.length === 0) {
    return NextResponse.json(
      {
        error:
          "El archivo no contiene filas con datos de usuarios. Completa al menos un registro y vuelve a subirlo.",
      },
      { status: 400 }
    );
  }

  const newCount = analyzedRows.filter((r) => r.status === "valid_new").length;
  const existingCount = analyzedRows.filter((r) => r.status === "existing").length;
  const invalidCount = analyzedRows.filter((r) => r.status === "invalid").length;
  const canImport = invalidCount === 0 && newCount > 0;

  // MODO PREVISUALIZACIÓN / VALIDACIÓN PREVIA (sin registrar en BD)
  if (dryRun) {
    return NextResponse.json({
      mode: "preview",
      fileName: file.name,
      totalRows: analyzedRows.length,
      newCount,
      existingCount,
      invalidCount,
      canImport,
      rows: analyzedRows,
    });
  }

  // MODO IMPORTACIÓN REAL: bloquear si hay cualquier error de validación
  if (invalidCount > 0) {
    return NextResponse.json(
      {
        error: `El documento tiene ${invalidCount} ${
          invalidCount === 1 ? "fila con errores" : "filas con errores"
        }. Revisa y corrige el archivo antes de subirlo.`,
      },
      { status: 400 }
    );
  }

  if (newCount === 0) {
    return NextResponse.json(
      {
        error:
          "Todos los usuarios del documento ya existen en el sistema. No hay usuarios nuevos para registrar.",
      },
      { status: 400 }
    );
  }

  const results: ImportRowResult[] = [];

  for (const row of analyzedRows) {
    if (row.status === "existing") {
      results.push({
        rowNumber: row.rowNumber,
        fullName: row.fullName,
        identification: row.identification,
        institutionalEmail: row.institutionalEmail,
        role: row.role,
        status: "skipped",
        message: "Ya existía en el sistema (omitido sin cambios).",
      });
      continue;
    }

    if (!row.role) continue;

    const created = await createManagedUser(auth.admin, {
      fullName: row.fullName,
      identification: row.identification,
      institutionalEmail: row.institutionalEmail,
      role: row.role,
    });

    if (created.ok) {
      results.push({
        rowNumber: row.rowNumber,
        fullName: created.user.full_name,
        identification: created.user.identification,
        institutionalEmail:
          created.user.institutional_email ?? row.institutionalEmail,
        role: created.user.role,
        status: "created",
        message: "Registrado (clave inicial = cédula; cambio obligatorio al ingresar).",
      });
    } else {
      results.push({
        rowNumber: row.rowNumber,
        fullName: row.fullName,
        identification: row.identification,
        institutionalEmail: row.institutionalEmail,
        role: row.role,
        status: "error",
        message: created.error,
      });
    }
  }

  const createdCount = results.filter((item) => item.status === "created").length;
  const skippedCount = results.filter((item) => item.status === "skipped").length;
  const errorCount = results.filter((item) => item.status === "error").length;

  try {
    await auth.admin.from("audit_logs").insert({
      user_id: auth.userId,
      action: "BULK_IMPORT_USERS",
      details: {
        file_name: file.name,
        total_processed: results.length,
        created_count: createdCount,
        skipped_existing_count: skippedCount,
        error_count: errorCount,
      },
    });
  } catch {
    // No bloquear por bitácora
  }

  return NextResponse.json({
    mode: "import",
    totalProcessed: results.length,
    createdCount,
    skippedCount,
    errorCount,
    results,
  });
}
