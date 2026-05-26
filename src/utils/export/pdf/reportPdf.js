import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatDateISOToHuman } from "../../formatters";
import { getTemplate } from "../../../config/clinicalSchemas/reports";
import { generateSchemaReportPdf } from "./schemaReportPdf";

const PAGE_MARGIN = 48;
const TITLE = 18;
const BODY = 11;
const LINE = 14;

/**
 * PDF para template LIBRE (texto sin estructura).
 * Los templates tipados (TBE, Psiquiátrico, futuros) se renderizan vía
 * generateSchemaReportPdf que es schema-driven.
 */
async function generateLibrePdf({ report, patient, generatedAt }) {
  const data = report.data || {};
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({
    x: 0, y: height - 72, width, height: 72, color: rgb(0.77, 0.96, 0.24),
  });
  page.drawText("Reporte clínico", {
    x: PAGE_MARGIN, y: height - 40, font: fontBold, size: TITLE,
    color: rgb(0.08, 0.14, 0.28),
  });
  page.drawText(`Folio: ${report.folio || "—"}`, {
    x: PAGE_MARGIN, y: height - 58, font: fontRegular, size: BODY,
    color: rgb(0.08, 0.14, 0.28),
  });

  let y = height - 110;
  page.drawText(`Paciente: ${patient.firstName || ""} ${patient.lastName || ""}`.trim(), {
    x: PAGE_MARGIN, y, font: fontBold, size: BODY,
  });
  y -= LINE;
  page.drawText(`Emitido: ${formatDateISOToHuman(report.signedAt || generatedAt)}`, {
    x: PAGE_MARGIN, y, font: fontRegular, size: BODY,
  });
  y -= LINE * 1.5;

  page.drawText(data.title || "Sin título", {
    x: PAGE_MARGIN, y, font: fontBold, size: 13,
  });
  y -= LINE * 1.2;

  const words = String(data.content || "—").split(/\s+/);
  let line = "";
  const maxWidth = width - PAGE_MARGIN * 2;
  for (const word of words) {
    const tentative = line ? `${line} ${word}` : word;
    if (fontRegular.widthOfTextAtSize(tentative, BODY) > maxWidth && line) {
      page.drawText(line, { x: PAGE_MARGIN, y, font: fontRegular, size: BODY });
      y -= LINE;
      line = word;
    } else {
      line = tentative;
    }
  }
  if (line) {
    page.drawText(line, { x: PAGE_MARGIN, y, font: fontRegular, size: BODY });
  }

  if (report.verificationCode) {
    page.drawText(`Verificación: ${report.verificationCode}`, {
      x: PAGE_MARGIN, y: 50, font: fontBold, size: 9,
      color: rgb(0.08, 0.14, 0.28),
    });
  }
  if (report.pdfHash) {
    page.drawText(`SHA-256: ${report.pdfHash.slice(0, 24)}…`, {
      x: PAGE_MARGIN, y: 36, font: fontRegular, size: 8,
      color: rgb(0.4, 0.45, 0.55),
    });
  }

  const bytes = await pdfDoc.save();
  return new Blob([bytes], { type: "application/pdf" });
}

export async function generateReportPdf({ report, patient, generatedAt = new Date().toISOString() }) {
  if (!report || !patient) {
    throw new Error("Reporte y paciente requeridos para generar el PDF.");
  }
  const template = getTemplate(report.template);
  // Si el template tiene secciones estructuradas, usa el renderer schema-driven.
  // Esto cubre TBE, Psiquiátrico y cualquier template futuro sin escribir PDF custom.
  if (template && template.id !== "LIBRE" && Array.isArray(template.sections) && template.sections.length > 0) {
    return generateSchemaReportPdf({ template, report, patient, generatedAt });
  }
  return generateLibrePdf({ report, patient, generatedAt });
}

export async function downloadReportPdf(options) {
  const blob = await generateReportPdf(options);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `reporte_${options.report.folio || options.report.id}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  return blob;
}

export default { generateReportPdf, downloadReportPdf };
