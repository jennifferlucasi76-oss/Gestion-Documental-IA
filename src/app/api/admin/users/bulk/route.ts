import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { verifyRectorApiCaller } from "@/lib/supabase/admin";
import { createManagedUser } from "@/lib/admin-users";
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

interface BulkRowResult {
  rowNumber: number;
  fullName: string;
  identification: string;
  institutionalEmail: string;
  role: UserRole | null;
  status: "created" | "error";
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
    department: -1,
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
      else if (h.includes("departamento") || h.includes("area"))
        temp.department = colNum;
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

  const results: BulkRowResult[] = [];

  for (let r = headerRowNumber + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const fullName = readCellText(row.getCell(colIndex.fullName));
    let identification = readCellText(row.getCell(colIndex.identification));
    const institutionalEmail = readCellText(
      row.getCell(colIndex.institutionalEmail)
    );
    const rawRole = readCellText(row.getCell(colIndex.role));
    const department =
      colIndex.department > 0
        ? readCellText(row.getCell(colIndex.department))
        : "";

    if (!fullName && !identification && !institutionalEmail && !rawRole) {
      continue;
    }

    if (/^[1-9]\d{8}$/.test(identification)) {
      identification = `0${identification}`;
    }

    const parsedRole = parseRoleInput(rawRole);
    if (!parsedRole) {
      results.push({
        rowNumber: r,
        fullName,
        identification,
        institutionalEmail,
        role: null,
        status: "error",
        message: rawRole
          ? `Rol no reconocido: "${rawRole}".`
          : "Falta seleccionar el Rol.",
      });
      continue;
    }

    const created = await createManagedUser(auth.admin, {
      fullName,
      identification,
      institutionalEmail,
      role: parsedRole,
      department: department || undefined,
    });

    if (created.ok) {
      results.push({
        rowNumber: r,
        fullName: created.user.full_name,
        identification: created.user.identification,
        institutionalEmail: created.user.institutional_email ?? institutionalEmail,
        role: created.user.role,
        status: "created",
        message: "Creado (clave inicial = cédula; cambio obligatorio al ingresar).",
      });
    } else {
      results.push({
        rowNumber: r,
        fullName,
        identification,
        institutionalEmail,
        role: parsedRole,
        status: "error",
        message: created.error,
      });
    }
  }

  if (results.length === 0) {
    return NextResponse.json(
      {
        error:
          "El archivo no contiene filas con datos de usuarios para importar.",
      },
      { status: 400 }
    );
  }

  const createdCount = results.filter((item) => item.status === "created").length;
  const errorCount = results.length - createdCount;

  try {
    await auth.admin.from("audit_logs").insert({
      user_id: auth.userId,
      action: "BULK_IMPORT_USERS",
      details: {
        file_name: file.name,
        total_processed: results.length,
        created_count: createdCount,
        error_count: errorCount,
      },
    });
  } catch {
    // No bloquear por bitácora
  }

  return NextResponse.json({
    totalProcessed: results.length,
    createdCount,
    errorCount,
    results,
  });
}
