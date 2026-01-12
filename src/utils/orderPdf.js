import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatDateISOToHuman } from "./formatters";

const MARGIN = 48;
const LINE = 16;

function computeAge(birthDate) {
  if (!birthDate) return "—";
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }
  return `${age} años`;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function wrapText(page, font, text, size, x, y) {
  const maxWidth = page.getWidth() - MARGIN * 2;
  const words = text.split(/\s+/);
  let line = "";
  let cursorY = y;

  for (const word of words) {
    const attempt = line ? `${line} ${word}` : word;
    const width = font.widthOfTextAtSize(attempt, size);
    if (width > maxWidth && line) {
      page.drawText(line, { x, y: cursorY, font, size });
      cursorY -= LINE;
      line = word;
    } else {
      line = attempt;
    }
  }

  if (line) {
    page.drawText(line, { x, y: cursorY, font, size });
    cursorY -= LINE;
  }
  return cursorY;
}

export async function generateOrderPdf({
  order,
  patient,
  professional,
  generatedAt = new Date().toISOString(),
}) {
  if (!order) {
    throw new Error("No se encontró la orden solicitada.");
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { height, width } = page.getSize();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({
    x: 0,
    y: height - 70,
    width,
    height: 70,
    color: rgb(0.54, 0.79, 0.05),
  });

  page.drawText("BreveMente — Orden clínica", {
    x: MARGIN,
    y: height - 35,
    font: fontBold,
    size: 18,
    color: rgb(0.08, 0.14, 0.28),
  });

  const issuedDate = formatDateISOToHuman(order.createdAt || generatedAt);
  const patientName =
    `${patient?.firstName ?? ""} ${patient?.lastName ?? ""}`.trim() ||
    order.patientName ||
    "Paciente";
  const patientCurp = patient?.curp || order.patientCurp || "CURP no disponible";
  const patientAge = computeAge(patient?.birthDate || order.patientBirthDate);

  let cursorY = height - 110;
  page.drawText(`Folio: ${order.folio}`, { x: MARGIN, y: cursorY, font: fontBold, size: 13 });
  cursorY -= LINE;
  page.drawText(`Fecha: ${issuedDate}`, { x: MARGIN, y: cursorY, font: fontRegular, size: 12 });
  cursorY -= LINE * 1.5;

  page.drawText("Profesional tratante", {
    x: MARGIN,
    y: cursorY,
    font: fontBold,
    size: 13,
  });
  cursorY -= LINE;
  page.drawText(`Nombre: ${professional?.name || "Profesional BreveMente"}`, {
    x: MARGIN,
    y: cursorY,
    font: fontRegular,
    size: 12,
  });
  cursorY -= LINE;
  if (professional?.license) {
    page.drawText(`Cédula: ${professional.license}`, {
      x: MARGIN,
      y: cursorY,
      font: fontRegular,
      size: 12,
    });
    cursorY -= LINE;
  }
  cursorY -= LINE * 0.5;

  page.drawText("Paciente", { x: MARGIN, y: cursorY, font: fontBold, size: 13 });
  cursorY -= LINE;
  page.drawText(`Nombre: ${patientName}`, { x: MARGIN, y: cursorY, font: fontRegular, size: 12 });
  cursorY -= LINE;
  page.drawText(`CURP: ${patientCurp}`, { x: MARGIN, y: cursorY, font: fontRegular, size: 12 });
  cursorY -= LINE;
  page.drawText(`Edad: ${patientAge}`, { x: MARGIN, y: cursorY, font: fontRegular, size: 12 });
  cursorY -= LINE * 1.5;

  page.drawText("Tipo de orden", { x: MARGIN, y: cursorY, font: fontBold, size: 13 });
  cursorY -= LINE;
  page.drawText(order.tipo || "—", { x: MARGIN, y: cursorY, font: fontRegular, size: 12 });
  cursorY -= LINE * 1.5;

  page.drawText("Descripción", { x: MARGIN, y: cursorY, font: fontBold, size: 13 });
  cursorY -= LINE;
  cursorY = wrapText(page, fontRegular, order.descripcion || "Sin descripción.", 12, MARGIN, cursorY);
  cursorY -= LINE * 0.5;

  if (order.indicaciones) {
    page.drawText("Indicaciones", { x: MARGIN, y: cursorY, font: fontBold, size: 13 });
    cursorY -= LINE;
    cursorY = wrapText(page, fontRegular, order.indicaciones, 12, MARGIN, cursorY);
    cursorY -= LINE * 0.5;
  }

  page.drawText("Documento generado digitalmente por BreveMente. Uso clínico exclusivo.", {
    x: MARGIN,
    y: 60,
    font: fontRegular,
    size: 10,
    color: rgb(0.3, 0.3, 0.3),
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}

export async function downloadOrderPdf(config) {
  const blob = await generateOrderPdf(config);
  const filename = `orden_${config?.order?.folio || "brevemente"}.pdf`;
  triggerDownload(blob, filename);
  return blob;
}

export default {
  generateOrderPdf,
  downloadOrderPdf,
};

