/**
 * Generador PDF schema-driven para reportes.
 *
 * Toma cualquier template definido en `config/clinicalSchemas/reports/` y produce
 * un PDF estilizado iterando sus `sections` + `fields`. Resuelve labels de
 * selects automáticamente y agrega el footer de verificación con folio + SHA-256.
 *
 * Si una sección queda demasiado larga, agrega páginas nuevas automáticamente.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatDateISOToHuman } from "../../formatters";

const PAGE_MARGIN = 48;
const BODY_FONT_SIZE = 10.5;
const TITLE_FONT_SIZE = 18;
const SECTION_TITLE_SIZE = 12.5;
const LABEL_FONT_SIZE = 9.5;
const LINE_HEIGHT = 13;
const PAGE_BOTTOM_LIMIT = 90; // reservado para el footer de verificación

function labelOfOption(options, value) {
  if (!Array.isArray(options) || value == null || value === "") return null;
  return options.find((o) => o.value === value)?.label || null;
}

function formatFieldValue(field, raw) {
  if (raw === undefined || raw === null || raw === "") return "—";
  if (field.type === "select") {
    return labelOfOption(field.options, raw) || String(raw);
  }
  if (field.type === "date") {
    return formatDateISOToHuman(raw);
  }
  return String(raw);
}

function drawWrappedText(page, text, { x, yStart, font, fontSize = BODY_FONT_SIZE, maxWidth, lineHeight = LINE_HEIGHT }) {
  if (!text) return yStart;
  const paragraphs = String(text).split(/\n/);
  let cursorY = yStart;
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/);
    let line = "";
    for (const word of words) {
      const tentative = line ? `${line} ${word}` : word;
      const width = font.widthOfTextAtSize(tentative, fontSize);
      if (width > maxWidth && line) {
        page.drawText(line, { x, y: cursorY, size: fontSize, font });
        cursorY -= lineHeight;
        line = word;
      } else {
        line = tentative;
      }
    }
    if (line) {
      page.drawText(line, { x, y: cursorY, size: fontSize, font });
      cursorY -= lineHeight;
    }
  }
  return cursorY;
}

function createPageContext(pdfDoc, fonts) {
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  return {
    page,
    width,
    height,
    cursorY: height - PAGE_MARGIN,
    fonts,
    maxWidth: width - PAGE_MARGIN * 2,
  };
}

function ensureSpace(ctx, requiredHeight) {
  if (ctx.cursorY - requiredHeight < PAGE_BOTTOM_LIMIT) {
    const newCtx = createPageContext(ctx.pdfDoc, ctx.fonts);
    Object.assign(ctx, newCtx);
    ctx.cursorY = newCtx.height - PAGE_MARGIN;
  }
}

function drawHeader(ctx, { title, folio, emittedAt }) {
  const { page, width, height, fonts } = ctx;
  page.drawRectangle({
    x: 0,
    y: height - 80,
    width,
    height: 80,
    color: rgb(0.77, 0.96, 0.24),
  });
  page.drawText(title, {
    x: PAGE_MARGIN,
    y: height - 36,
    font: fonts.bold,
    size: TITLE_FONT_SIZE,
    color: rgb(0.08, 0.14, 0.28),
  });
  if (folio) {
    page.drawText(`Folio: ${folio}`, {
      x: PAGE_MARGIN,
      y: height - 58,
      font: fonts.regular,
      size: BODY_FONT_SIZE,
      color: rgb(0.08, 0.14, 0.28),
    });
  }
  if (emittedAt) {
    const emittedText = `Emitida: ${formatDateISOToHuman(emittedAt)}`;
    const txtWidth = fonts.regular.widthOfTextAtSize(emittedText, BODY_FONT_SIZE);
    page.drawText(emittedText, {
      x: width - PAGE_MARGIN - txtWidth,
      y: height - 58,
      font: fonts.regular,
      size: BODY_FONT_SIZE,
      color: rgb(0.08, 0.14, 0.28),
    });
  }
  ctx.cursorY = height - 110;
}

function drawSectionTitle(ctx, title) {
  ensureSpace(ctx, LINE_HEIGHT * 2);
  const { page, fonts, width } = ctx;
  ctx.cursorY -= 4;
  page.drawText(title, {
    x: PAGE_MARGIN,
    y: ctx.cursorY,
    font: fonts.bold,
    size: SECTION_TITLE_SIZE,
    color: rgb(0.07, 0.11, 0.2),
  });
  ctx.cursorY -= 6;
  page.drawLine({
    start: { x: PAGE_MARGIN, y: ctx.cursorY },
    end: { x: width - PAGE_MARGIN, y: ctx.cursorY },
    thickness: 0.5,
    color: rgb(0.77, 0.96, 0.24),
  });
  ctx.cursorY -= LINE_HEIGHT;
}

function drawField(ctx, label, value) {
  ensureSpace(ctx, LINE_HEIGHT * 2);
  const { page, fonts, maxWidth } = ctx;
  page.drawText(label, {
    x: PAGE_MARGIN,
    y: ctx.cursorY,
    font: fonts.bold,
    size: LABEL_FONT_SIZE,
    color: rgb(0.35, 0.4, 0.5),
  });
  ctx.cursorY -= LINE_HEIGHT;
  ctx.cursorY = drawWrappedText(page, value, {
    x: PAGE_MARGIN,
    yStart: ctx.cursorY,
    font: fonts.regular,
    fontSize: BODY_FONT_SIZE,
    maxWidth,
  });
  ctx.cursorY -= 4;
}

function drawFooter(ctx, { folio, pdfHash, verificationCode }) {
  const { page, width, fonts } = ctx;
  const footerY = 52;
  page.drawLine({
    start: { x: PAGE_MARGIN, y: footerY + 28 },
    end: { x: width - PAGE_MARGIN, y: footerY + 28 },
    thickness: 0.5,
    color: rgb(0.7, 0.75, 0.8),
  });
  const verifLabel = verificationCode || folio
    ? `Verificación: ${verificationCode || folio}`
    : "Verificación: pendiente de firma";
  page.drawText(verifLabel, {
    x: PAGE_MARGIN,
    y: footerY + 14,
    font: fonts.bold,
    size: 9,
    color: rgb(0.08, 0.14, 0.28),
  });
  if (pdfHash) {
    page.drawText(`SHA-256: ${pdfHash.slice(0, 24)}…`, {
      x: PAGE_MARGIN,
      y: footerY,
      font: fonts.regular,
      size: 8,
      color: rgb(0.4, 0.45, 0.55),
    });
  }
  const legend = "Documento sujeto al secreto profesional · NOM-004 · ROMI TBE";
  const legendWidth = fonts.regular.widthOfTextAtSize(legend, 8);
  page.drawText(legend, {
    x: width - PAGE_MARGIN - legendWidth,
    y: footerY,
    font: fonts.regular,
    size: 8,
    color: rgb(0.4, 0.45, 0.55),
  });
}

export async function generateSchemaReportPdf({ template, report, patient, generatedAt = new Date().toISOString() }) {
  if (!template) throw new Error("Template requerido para generar el PDF.");
  if (!report) throw new Error("Reporte requerido.");
  if (!patient) throw new Error("Datos del paciente requeridos.");

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fonts = { regular: fontRegular, bold: fontBold };

  const ctx = createPageContext(pdfDoc, fonts);
  ctx.pdfDoc = pdfDoc;

  drawHeader(ctx, {
    title: template.label || "Reporte clínico",
    folio: report.folio,
    emittedAt: report.signedAt || generatedAt,
  });

  for (const section of template.sections || []) {
    drawSectionTitle(ctx, section.title);
    for (const field of section.fields || []) {
      drawField(ctx, field.label, formatFieldValue(field, report.data?.[field.name]));
    }
  }

  // El footer de verificación se imprime SOLO en la página actual (última).
  drawFooter(ctx, {
    folio: report.folio,
    pdfHash: report.pdfHash,
    verificationCode: report.verificationCode,
  });

  const bytes = await pdfDoc.save();
  return new Blob([bytes], { type: "application/pdf" });
}

export default generateSchemaReportPdf;
