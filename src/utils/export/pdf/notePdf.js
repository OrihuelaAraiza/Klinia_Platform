import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatDateISOToHuman } from "../../formatters";

const MARGIN = 48;
const BODY_FONT_SIZE = 11;
const TITLE_FONT_SIZE = 16;
const LINE_HEIGHT = 14;

function drawWrappedText(page, text, options) {
  const {
    x,
    yStart,
    font,
    fontSize = BODY_FONT_SIZE,
    maxWidth = page.getWidth() - MARGIN * 2,
    lineHeight = LINE_HEIGHT,
  } = options;

  if (!text) {
    return yStart;
  }

  const words = text.split(/\s+/);
  let line = "";
  let cursorY = yStart;

  for (const word of words) {
    const attempt = line ? `${line} ${word}` : word;
    const width = font.widthOfTextAtSize(attempt, fontSize);
    if (width > maxWidth && line) {
      page.drawText(line, { x, y: cursorY, size: fontSize, font });
      cursorY -= lineHeight;
      line = word;
    } else {
      line = attempt;
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
  const maxWidth = page.getWidth() - MARGIN * 2;
  page.drawText(title, {
    x: MARGIN,
    y: cursorY,
    font: bold,
    size: 13,
    color: rgb(0.07, 0.11, 0.2),
  });
  cursorY -= LINE_HEIGHT + 4;
  cursorY = drawWrappedText(page, content || "Sin información capturada.", {
    x: MARGIN,
    yStart: cursorY,
    font: regular,
    fontSize: BODY_FONT_SIZE,
    maxWidth,
  });
  cursorY -= 8;
  return cursorY;
}

export async function generateNotePdf({ patient, note, generatedAt = new Date().toISOString() }) {
  if (!note) {
    throw new Error("No se proporcionó una nota clínica para exportar.");
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({
    x: 0,
    y: height - 60,
    width: page.getWidth(),
    height: 60,
    color: rgb(0.77, 0.96, 0.24),
  });

  page.drawText("BreveMente — Nota de evolución", {
    x: MARGIN,
    y: height - 32,
    font: fontBold,
    size: TITLE_FONT_SIZE,
    color: rgb(0.08, 0.14, 0.28),
  });

  const patientName = `${patient?.firstName ?? ""} ${patient?.lastName ?? ""}`.trim() || "Paciente sin nombre";
  const noteDate = note.datetime ? formatDateISOToHuman(note.datetime) : "Fecha no registrada";
  const generatedDate = formatDateISOToHuman(generatedAt);

  let cursorY = height - 90;
  page.drawText(`Paciente: ${patientName}`, { x: MARGIN, y: cursorY, font: fontBold, size: 13 });
  cursorY -= LINE_HEIGHT;
  page.drawText(`CURP: ${patient?.curp ?? "CURP no registrado"}`, { x: MARGIN, y: cursorY, font: fontRegular, size: BODY_FONT_SIZE });
  cursorY -= LINE_HEIGHT;
  page.drawText(`Nota registrada el: ${noteDate}`, { x: MARGIN, y: cursorY, font: fontRegular, size: BODY_FONT_SIZE });
  cursorY -= LINE_HEIGHT;
  page.drawText(`Estado: ${note.status === "closed" ? "Cerrada" : "Abierta"}`, {
    x: MARGIN,
    y: cursorY,
    font: fontRegular,
    size: BODY_FONT_SIZE,
  });
  cursorY -= LINE_HEIGHT * 1.5;

  cursorY = drawSection(page, "Subjetivo (S)", note.subjective, { bold: fontBold, regular: fontRegular }, cursorY);
  cursorY = drawSection(page, "Objetivo (O)", note.objective, { bold: fontBold, regular: fontRegular }, cursorY);
  cursorY = drawSection(page, "Análisis (A)", note.analysis, { bold: fontBold, regular: fontRegular }, cursorY);
  cursorY = drawSection(page, "Plan (P)", note.plan, { bold: fontBold, regular: fontRegular }, cursorY);

  const diagnoses =
    Array.isArray(note.diagnoses) && note.diagnoses.length
      ? note.diagnoses.map((dx) => `${dx.code} — ${dx.label}`).join("; ")
      : "Sin diagnósticos registrados.";
  cursorY = drawSection(page, "Diagnósticos", diagnoses, { bold: fontBold, regular: fontRegular }, cursorY);

  const professionalName = note.professional?.name || "Profesional no registrado";
  const license = note.professional?.license ? ` — Cédula ${note.professional.license}` : "";
  page.drawText(`Profesional: ${professionalName}${license}`, {
    x: MARGIN,
    y: cursorY,
    font: fontBold,
    size: BODY_FONT_SIZE,
  });
  cursorY -= LINE_HEIGHT;

  if (note.status === "closed") {
    const closedAt = note.closedAt ? formatDateISOToHuman(note.closedAt) : noteDate;
    page.drawText(`Nota cerrada el: ${closedAt}`, {
      x: MARGIN,
      y: cursorY,
      font: fontRegular,
      size: BODY_FONT_SIZE,
    });
    cursorY -= LINE_HEIGHT;
  }

  const addenda = Array.isArray(note.addenda ?? note.addendums) ? note.addenda ?? note.addendums : [];
  if (addenda.length) {
    cursorY = drawSection(
      page,
      "Addendums",
      addenda
        .map((item) => {
          const date = item.datetime ? formatDateISOToHuman(item.datetime) : "";
          return `${date} — ${item.author ?? "Autor desconocido"}: ${item.text ?? ""}`;
        })
        .join("\n"),
      { bold: fontBold, regular: fontRegular },
      cursorY
    );
  }

  page.drawText("Documento generado por BreveMente (PMV) — No sustituye firma autógrafa.", {
    x: MARGIN,
    y: 32,
    font: fontRegular,
    size: 9,
    color: rgb(0.4, 0.4, 0.4),
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}

export default generateNotePdf;
