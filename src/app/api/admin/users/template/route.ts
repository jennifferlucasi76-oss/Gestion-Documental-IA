import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { verifyRectorApiCaller } from "@/lib/supabase/admin";
import { ASSIGNABLE_USER_ROLES, EXCEL_ROLE_LABELS } from "@/lib/roles";

const MIN_ROWS = 1;
const MAX_ROWS = 500;
const DEFAULT_ROWS = 20;

export async function GET(request: NextRequest) {
  const auth = await verifyRectorApiCaller();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const rawRows = Number.parseInt(
    request.nextUrl.searchParams.get("rows") ?? "",
    10
  );
  const totalInputRows = Number.isFinite(rawRows)
    ? Math.min(MAX_ROWS, Math.max(MIN_ROWS, rawRows))
    : DEFAULT_ROWS;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Unidad Educativa San José - SGDI-IA";
  workbook.created = new Date();
  workbook.subject = "Formato Oficial de Registro Masivo de Usuarios";

  // =========================================================================
  // HOJA 1: REGISTRO DE USUARIOS (5 columnas limpias: N°, Nombres, Cédula, Correo, Rol)
  // =========================================================================
  const sheet = workbook.addWorksheet("Registro de Usuarios", {
    views: [{ state: "frozen", ySplit: 6, showGridLines: false }],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  sheet.columns = [
    { key: "num", width: 8 },
    { key: "nombres", width: 38 },
    { key: "cedula", width: 20 },
    { key: "correo", width: 38 },
    { key: "rol", width: 30 },
  ];

  // Banner superior institucional (Filas 1-4)
  for (let r = 1; r <= 4; r++) {
    const row = sheet.getRow(r);
    row.height = r === 1 ? 26 : r === 2 ? 22 : r === 3 ? 19 : 17;
    for (let c = 1; c <= 5; c++) {
      row.getCell(c).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF981018" },
      };
    }
  }

  sheet.mergeCells("A1:A4");
  sheet.mergeCells("B1:E1");
  sheet.mergeCells("B2:E2");
  sheet.mergeCells("B3:E3");
  sheet.mergeCells("B4:E4");

  const titleCell = sheet.getCell("B1");
  titleCell.value = "UNIDAD EDUCATIVA SAN JOSÉ — GUAYAQUIL";
  titleCell.font = {
    name: "Calibri",
    size: 16,
    bold: true,
    color: { argb: "FFFFFFFF" },
  };
  titleCell.alignment = { vertical: "bottom", horizontal: "left" };

  const subtitleCell = sheet.getCell("B2");
  subtitleCell.value = `FORMATO OFICIAL DE REGISTRO MASIVO DE USUARIOS (${totalInputRows} REGISTROS) • SGDI-IA`;
  subtitleCell.font = {
    name: "Calibri",
    size: 10.5,
    bold: true,
    color: { argb: "FFF8D000" },
  };
  subtitleCell.alignment = { vertical: "middle", horizontal: "left" };

  const hintCell = sheet.getCell("B3");
  hintCell.value =
    "Complete los datos desde la fila 7. En la columna Rol utilice la lista desplegable de cada fila.";
  hintCell.font = {
    name: "Calibri",
    size: 9.5,
    italic: true,
    color: { argb: "FFFDECEC" },
  };
  hintCell.alignment = { vertical: "middle", horizontal: "left" };

  const passHintCell = sheet.getCell("B4");
  passHintCell.value =
    "Seguridad: La contraseña inicial será automáticamente la cédula y el usuario deberá cambiarla obligatoriamente en su primer acceso.";
  passHintCell.font = {
    name: "Calibri",
    size: 9,
    color: { argb: "FFFDF2F3" },
  };
  passHintCell.alignment = { vertical: "top", horizontal: "left" };

  // Escudo transparente en A1:A4
  try {
    const logoPath = path.join(process.cwd(), "public", "logo-ue-sanjose.png");
    const logoBuffer = await readFile(logoPath);
    const logoId = workbook.addImage({
      base64: `data:image/png;base64,${logoBuffer.toString("base64")}`,
      extension: "png",
    });
    sheet.getCell("A1").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFFFFF" },
    };
    sheet.addImage(logoId, {
      tl: { col: 0.14, row: 0.15 },
      ext: { width: 58, height: 69 },
    });
  } catch {
    // Continuar sin bloquear si falla la lectura del logo
  }

  // Fila 5: Franja dorada institucional (#F8D000)
  const goldRow = sheet.getRow(5);
  goldRow.height = 6;
  for (let c = 1; c <= 5; c++) {
    goldRow.getCell(c).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF8D000" },
    };
  }

  // Fila 6: Encabezados de tabla (#7A0C13)
  const headerTitles = [
    "N°",
    "Nombres Completos *",
    "Cédula *",
    "Correo Institucional *",
    "Rol *",
  ];
  const headerRow = sheet.getRow(6);
  headerRow.height = 28;
  headerTitles.forEach((text, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = text;
    cell.font = {
      name: "Calibri",
      size: 10.5,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF7A0C13" },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: idx === 0 || idx === 2 ? "center" : "left",
      wrapText: true,
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF5E090E" } },
      bottom: { style: "medium", color: { argb: "FF5E090E" } },
      left: { style: "thin", color: { argb: "FF981018" } },
      right: { style: "thin", color: { argb: "FF981018" } },
    };
  });

  // =========================================================================
  // HOJA OCULTA DE CATÁLOGO PARA COMBOBOX COMPATIBLE CON EXCEL EN ESPAÑOL/INGLÉS
  // =========================================================================
  const catalogSheet = workbook.addWorksheet("Roles", { state: "hidden" });
  const roleOptions = ASSIGNABLE_USER_ROLES.map((r) => EXCEL_ROLE_LABELS[r]);
  roleOptions.forEach((label, idx) => {
    catalogSheet.getCell(`A${idx + 1}`).value = label;
  });
  const roleListFormula = `=Roles!$A$1:$A$${roleOptions.length}`;

  // Filas configurables (7 hasta 7 + totalInputRows - 1)
  for (let i = 0; i < totalInputRows; i++) {
    const rowNum = 7 + i;
    const row = sheet.getRow(rowNum);
    row.height = 24;
    const isAlt = i % 2 === 1;
    const rowBg = isAlt ? "FFFDF7F7" : "FFFFFFFF";

    row.getCell(1).value = i + 1;

    for (let c = 1; c <= 5; c++) {
      const cell = row.getCell(c);
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: rowBg },
      };
      cell.font = {
        name: "Calibri",
        size: 10,
        color: { argb: c === 1 ? "FF7A0C13" : "FF1F1718" },
        bold: c === 1,
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: c === 1 || c === 3 ? "center" : "left",
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFEADCDF" } },
        bottom: { style: "thin", color: { argb: "FFEADCDF" } },
        left: { style: "thin", color: { argb: "FFEADCDF" } },
        right: { style: "thin", color: { argb: "FFEADCDF" } },
      };
    }

    // Formato Texto (@) en Cédula para conservar ceros iniciales (ej. 09...)
    row.getCell(3).numFmt = "@";

    // Combobox desplegable basado en rango (funciona en cualquier idioma de Excel)
    row.getCell(5).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [roleListFormula],
      showInputMessage: true,
      promptTitle: "Seleccionar Rol",
      prompt:
        "Despliegue la flecha y elija: Personal Administrativo, Docente o Coordinador de Área.",
      showErrorMessage: true,
      errorStyle: "stop",
      errorTitle: "Rol no válido",
      error:
        "Seleccione únicamente uno de los roles permitidos en la lista desplegable.",
    };
  }

  // =========================================================================
  // HOJA 2: INSTRUCCIONES Y ROLES
  // =========================================================================
  const guide = workbook.addWorksheet("Instrucciones y Roles", {
    views: [{ showGridLines: false }],
  });
  guide.columns = [{ width: 30 }, { width: 22 }, { width: 66 }];

  guide.mergeCells("A1:C1");
  const gTitle = guide.getCell("A1");
  gTitle.value = "GUÍA DE LLENADO — REGISTRO MASIVO DE USUARIOS (UE SAN JOSÉ)";
  gTitle.font = {
    name: "Calibri",
    size: 13,
    bold: true,
    color: { argb: "FFFFFFFF" },
  };
  gTitle.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF981018" },
  };
  gTitle.alignment = { vertical: "middle", horizontal: "left" };
  guide.getRow(1).height = 30;

  const gGold = guide.getRow(2);
  gGold.height = 5;
  for (let c = 1; c <= 3; c++) {
    gGold.getCell(c).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF8D000" },
    };
  }

  const guideHeaders = [
    "Campo / Rol",
    "Requisito",
    "Descripción y política de acceso",
  ];
  const gHeaderRow = guide.getRow(4);
  gHeaderRow.height = 24;
  guideHeaders.forEach((h, i) => {
    const cell = gHeaderRow.getCell(i + 1);
    cell.value = h;
    cell.font = {
      name: "Calibri",
      size: 10.5,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF7A0C13" },
    };
    cell.alignment = { vertical: "middle", horizontal: "left" };
  });

  const rowsData: [string, string, string][] = [
    [
      "Nombres Completos",
      "Obligatorio",
      "Apellidos y nombres del colaborador (ej. María Fernanda Torres López).",
    ],
    [
      "Cédula",
      "Obligatorio",
      "Número de identificación único (ej. 0912345678). Será el usuario y la contraseña inicial temporal.",
    ],
    [
      "Correo Institucional",
      "Obligatorio",
      "Correo oficial del usuario (ej. mtorres@uesanjose.edu.ec).",
    ],
    [
      "Rol",
      "Obligatorio",
      "Haga clic en la celda y seleccione desde el combobox: Personal Administrativo, Docente o Coordinador de Área.",
    ],
    [
      "Primer Inicio de Sesión",
      "Política de seguridad",
      "Al ingresar por primera vez con su cédula, el sistema obligará a crear una contraseña segura (mín. 8 caracteres, mayúsculas, minúsculas, números y símbolos).",
    ],
    ["", "", ""],
    [
      "Personal Administrativo",
      "Rol disponible",
      "Secretario / Gestor de archivos: digitalización, clasificación asistida por IA y despacho.",
    ],
    [
      "Docente",
      "Rol disponible",
      "Generador de entregables académicos, consulta autorizada y seguimiento estudiantil (DECE).",
    ],
    [
      "Coordinador de Área",
      "Rol disponible",
      "Revisión y aprobación documental, consolidados departamentales y base de conocimiento.",
    ],
  ];

  rowsData.forEach((entry, idx) => {
    const r = guide.getRow(5 + idx);
    r.height = entry[0] === "" ? 10 : 25;
    entry.forEach((val, cIdx) => {
      const cell = r.getCell(cIdx + 1);
      cell.value = val;
      cell.font = {
        name: "Calibri",
        size: 10,
        bold: cIdx === 0,
        color: { argb: cIdx === 0 ? "FF7A0C13" : "FF1F1718" },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "left",
        wrapText: true,
      };
      if (entry[0] !== "") {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: idx % 2 === 1 ? "FFFDF7F7" : "FFFFFFFF" },
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFEADCDF" } },
          bottom: { style: "thin", color: { argb: "FFEADCDF" } },
          left: { style: "thin", color: { argb: "FFEADCDF" } },
          right: { style: "thin", color: { argb: "FFEADCDF" } },
        };
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Formato_Registro_Usuarios_UE_San_Jose_${totalInputRows}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
