import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatDateISOToHuman } from "../../formatters";

const PAGE_MARGIN = 48;
const BODY_FONT_SIZE = 11;
const TITLE_FONT_SIZE = 18;
const SECTION_TITLE_SIZE = 13;
const LINE_HEIGHT = 14;

function drawWrappedText(page, text, options) {
  const {
    x,
    yStart,
    font,
    fontSize = BODY_FONT_SIZE,
    maxWidth = page.getWidth() - PAGE_MARGIN * 2,
    lineHeight = LINE_HEIGHT,
  } = options;

  if (!text) {
    return yStart;
  }

  const words = text.split(/\s+/);
  let line = "";
  let cursorY = yStart;

  for (const word of words) {
    const tentativeLine = line ? `${line} ${word}` : word;
    const width = font.widthOfTextAtSize(tentativeLine, fontSize);
    if (width > maxWidth && line) {
      page.drawText(line, { x, y: cursorY, size: fontSize, font });
      cursorY -= lineHeight;
      line = word;
    } else {
      line = tentativeLine;
    }
  }

  if (line) {
    page.drawText(line, { x, y: cursorY, size: fontSize, font });
    cursorY -= lineHeight;
  }

  return cursorY;
}

function drawSection(page, title, content, fonts, cursorY) {
  const { bold, regular } = fonts;
  const maxWidth = page.getWidth() - PAGE_MARGIN * 2;
  page.drawText(title, {
    x: PAGE_MARGIN,
    y: cursorY,
    font: bold,
    size: SECTION_TITLE_SIZE,
    color: rgb(0.07, 0.11, 0.2),
  });
  cursorY -= LINE_HEIGHT + 4;
  cursorY = drawWrappedText(page, content || "Sin información capturada.", {
    x: PAGE_MARGIN,
    yStart: cursorY,
    font: regular,
    fontSize: BODY_FONT_SIZE,
    maxWidth,
  });
  cursorY -= 8;
  return cursorY;
}

export async function generateHistoryPdf({
  patient,
  history,
  prescriptions = [],
  generatedAt = new Date().toISOString(),
}) {
  if (!history) {
    throw new Error("No hay historia clínica registrada para este paciente.");
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({
    x: 0,
    y: height - 72,
    width,
    height: 72,
    color: rgb(0.77, 0.96, 0.24),
  });

  page.drawText("BreveMente — Historia Clínica", {
    x: PAGE_MARGIN,
    y: height - 40,
    font: fontBold,
    size: TITLE_FONT_SIZE,
    color: rgb(0.08, 0.14, 0.28),
  });

  const patientName = `${patient?.firstName ?? ""} ${patient?.lastName ?? ""}`.trim() || "Paciente sin nombre";
  const curp = patient?.curp ?? "CURP no registrado";
  const generatedDate = formatDateISOToHuman(generatedAt);

  let cursorY = height - 100;
  page.drawText(`Paciente: ${patientName}`, {
    x: PAGE_MARGIN,
    y: cursorY,
    font: fontBold,
    size: SECTION_TITLE_SIZE,
  });
  cursorY -= LINE_HEIGHT;
  page.drawText(`CURP: ${curp}`, {
    x: PAGE_MARGIN,
    y: cursorY,
    font: fontRegular,
    size: BODY_FONT_SIZE,
  });
  cursorY -= LINE_HEIGHT;
  page.drawText(`Generado: ${generatedDate}`, {
    x: PAGE_MARGIN,
    y: cursorY,
    font: fontRegular,
    size: BODY_FONT_SIZE,
  });
  cursorY -= LINE_HEIGHT * 1.5;

  cursorY = drawSection(page, "Motivo de consulta", history.motive, { bold: fontBold, regular: fontRegular }, cursorY);
  cursorY = drawSection(
    page,
    "Antecedentes psicosociales",
    history.psychosocialBackground,
    { bold: fontBold, regular: fontRegular },
    cursorY
  );
  cursorY = drawSection(
    page,
    "Examen mental",
    history.mentalStatusExam,
    { bold: fontBold, regular: fontRegular },
    cursorY
  );

  const diagnoses =
    Array.isArray(history.diagnoses) && history.diagnoses.length
      ? history.diagnoses.map((dx) => `${dx.code} — ${dx.label}`).join("; ")
      : "Sin diagnósticos registrados.";
  cursorY = drawSection(page, "Diagnósticos (CIE-10)", diagnoses, { bold: fontBold, regular: fontRegular }, cursorY);

  cursorY = drawSection(
    page,
    "Objetivos terapéuticos",
    history.goals,
    { bold: fontBold, regular: fontRegular },
    cursorY
  );
  cursorY = drawSection(
    page,
    "Plan terapéutico",
    history.therapeuticPlan,
    { bold: fontBold, regular: fontRegular },
    cursorY
  );

  const professionalName = history.professional?.name || "Profesional no registrado";
  const license = history.professional?.license ? ` — Cédula ${history.professional.license}` : "";
  const historyDate = history.createdAt ? formatDateISOToHuman(history.createdAt) : generatedDate;
  page.drawText(`Responsable: ${professionalName}${license}`, {
    x: PAGE_MARGIN,
    y: cursorY,
    font: fontBold,
    size: BODY_FONT_SIZE,
  });
  cursorY -= LINE_HEIGHT;
  page.drawText(`Registro: ${historyDate}`, {
    x: PAGE_MARGIN,
    y: cursorY,
    font: fontRegular,
    size: BODY_FONT_SIZE,
  });

  cursorY -= LINE_HEIGHT * 1.5;
  page.drawText("Prescripciones", {
    x: PAGE_MARGIN,
    y: cursorY,
    font: fontBold,
    size: SECTION_TITLE_SIZE,
  });
  cursorY -= LINE_HEIGHT;

  if (Array.isArray(prescriptions) && prescriptions.length) {
    prescriptions.slice(0, 5).forEach((item) => {
      page.drawText(`${item.folio ?? "RX"} — ${formatDateISOToHuman(item.createdAt)}`, {
        x: PAGE_MARGIN,
        y: cursorY,
        font: fontBold,
        size: BODY_FONT_SIZE,
      });
      cursorY -= LINE_HEIGHT;
      const detail = `Principio activo: ${item.substance} | Dosis: ${item.dose} | Frecuencia: ${item.frequency}`;
      cursorY = drawWrappedText(page, detail, {
        x: PAGE_MARGIN,
        yStart: cursorY,
        font: fontRegular,
        fontSize: BODY_FONT_SIZE,
      });
      cursorY -= LINE_HEIGHT * 0.5;
    });
    if (prescriptions.length > 5) {
      page.drawText(`+${prescriptions.length - 5} prescripciones adicionales registradas.`, {
        x: PAGE_MARGIN,
        y: cursorY,
        font: fontRegular,
        size: BODY_FONT_SIZE,
      });
      cursorY -= LINE_HEIGHT;
    }
  } else {
    page.drawText("Sin prescripciones registradas.", {
      x: PAGE_MARGIN,
      y: cursorY,
      font: fontRegular,
      size: BODY_FONT_SIZE,
    });
    cursorY -= LINE_HEIGHT;
  }

  page.drawText("Documento generado por BreveMente (PMV) — No sustituye firma autógrafa.", {
    x: PAGE_MARGIN,
    y: 32,
    font: fontRegular,
    size: 9,
    color: rgb(0.4, 0.4, 0.4),
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}

export default generateHistoryPdf;
