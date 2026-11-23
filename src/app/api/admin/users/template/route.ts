import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { verifyRectorApiCaller } from "@/lib/supabase/admin";
import { EXCEL_ROLE_LABELS } from "@/lib/roles";

export async function GET() {
  const auth = await verifyRectorApiCaller();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Unidad Educativa San José - SGDI-IA";
  workbook.created = new Date();
  workbook.subject = "Formato Oficial de Registro Masivo de Usuarios";

  // =========================================================================
  // HOJA 1: REGISTRO DE USUARIOS (6 columnas limpias, sin columna de contraseña)
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
    { key: "nombres", width: 36 },
    { key: "cedula", width: 19 },
    { key: "correo", width: 36 },
    { key: "rol", width: 38 },
    { key: "departamento", width: 26 },
  ];

  // Banner superior institucional (Filas 1-4)
  for (let r = 1; r <= 4; r++) {
    const row = sheet.getRow(r);
    row.height = r === 1 ? 26 : r === 2 ? 22 : r === 3 ? 19 : 17;
    for (let c = 1; c <= 6; c++) {
      row.getCell(c).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF981018" },
      };
    }
  }

  sheet.mergeCells("A1:A4");
  sheet.mergeCells("B1:F1");
  sheet.mergeCells("B2:F2");
  sheet.mergeCells("B3:F3");
  sheet.mergeCells("B4:F4");

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
  subtitleCell.value =
    "FORMATO OFICIAL DE REGISTRO MASIVO DE USUARIOS • SISTEMA DE GESTIÓN DOCUMENTAL (SGDI-IA)";
  subtitleCell.font = {
    name: "Calibri",
    size: 10.5,
    bold: true,
    color: { argb: "FFF8D000" },
  };
  subtitleCell.alignment = { vertical: "middle", horizontal: "left" };

  const hintCell = sheet.getCell("B3");
  hintCell.value =
    "Complete los datos desde la fila 7. Los campos marcados con (*) son obligatorios. Use la lista desplegable en la columna Rol.";
  hintCell.font = {
    name: "Calibri",
    size: 9.5,
    italic: true,
    color: { argb: "FFFDECEC" },
  };
  hintCell.alignment = { vertical: "middle", horizontal: "left" };

  const passHintCell = sheet.getCell("B4");
  passHintCell.value =
    "Seguridad: La contraseña inicial será automáticamente el número de cédula y deberá cambiarse obligatoriamente en el primer ingreso.";
  passHintCell.font = {
    name: "Calibri",
    size: 9,
    color: { argb: "FFFDF2F3" },
  };
  passHintCell.alignment = { vertical: "top", horizontal: "left" };

  // Insertar escudo transparente en A1:A4 (celda con fondo blanco limpio para contraste)
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
    // Si no se encuentra el logo, continúa sin bloquear la generación del Excel.
  }

  // Fila 5: Franja dorada institucional (#F8D000)
  const goldRow = sheet.getRow(5);
  goldRow.height = 6;
  for (let c = 1; c <= 6; c++) {
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
    "Departamento / Área",
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

  // Filas 7 a 56 (50 espacios estilizados listos para llenar)
  const roleFormula = `"${Object.values(EXCEL_ROLE_LABELS).join(",")}"`;
  const totalInputRows = 50;

  for (let i = 0; i < totalInputRows; i++) {
    const rowNum = 7 + i;
    const row = sheet.getRow(rowNum);
    row.height = 23;
    const isAlt = i % 2 === 1;
    const rowBg = isAlt ? "FFFDF7F7" : "FFFFFFFF";

    row.getCell(1).value = i + 1;

    for (let c = 1; c <= 6; c++) {
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

    // Lista desplegable estricta en la columna Rol (Columna E)
    row.getCell(5).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [roleFormula],
      showErrorMessage: true,
      errorStyle: "stop",
      errorTitle: "Rol no válido",
      error:
        "Seleccione uno de los roles institucionales de la lista desplegable.",
    };
  }

  // =========================================================================
  // HOJA 2: INSTRUCCIONES Y ROLES
  // =========================================================================
  const guide = workbook.addWorksheet("Instrucciones y Roles", {
    views: [{ showGridLines: false }],
  });
  guide.columns = [{ width: 32 }, { width: 22 }, { width: 66 }];

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
      "Seleccione de la lista desplegable en la hoja 'Registro de Usuarios'.",
    ],
    [
      "Departamento / Área",
      "Opcional",
      "Área o dependencia (si se omite, se asigna automáticamente según el rol).",
    ],
    [
      "Primer Inicio de Sesión",
      "Política de seguridad",
      "Al ingresar por primera vez con su cédula, el sistema obligará a crear una contraseña segura (mín. 8 caracteres, mayúsculas, minúsculas, números y símbolos).",
    ],
    ["", "", ""],
    [
      "Secretario / Personal Administrativo",
      "Rol válido",
      "Operador principal: digitalización, clasificación asistida por IA y despacho.",
    ],
    [
      "Docente",
      "Rol válido",
      "Generador de entregables académicos, consulta autorizada y seguimiento DECE.",
    ],
    [
      "Coordinador de Área",
      "Rol válido",
      "Revisión y aprobación documental, consolidados y base de conocimiento del área.",
    ],
    [
      "Rector / Equipo Directivo",
      "Rol válido",
      "Administrador del sistema, consulta ejecutiva, cumplimiento MINEDUC y políticas.",
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
      "Content-Disposition":
        'attachment; filename="Formato_Registro_Usuarios_UE_San_Jose.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
