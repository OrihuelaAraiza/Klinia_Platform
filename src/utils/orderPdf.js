import {
  createBasePdf,
  finalizePdf,
  drawSection,
  drawKeyValues,
  PAGE,
  TYPE,
  LH,
  COLOR,
} from "./export/pdf/basePdfTemplate";
import { generateAndRegister } from "./export/pdf/triggerAndRegister";
import { canonicalize, sha256 } from "./export/composeRecord";
import { formatDateISOToHuman } from "./formatters";

function computeAge(birthDate) {
  if (!birthDate) return "—";
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return "—";
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) age -= 1;
  return `${age} años`;
}

export async function generateOrderPdf({
  order,
  patient,
  professional,
  folio,
  generatedAt = new Date().toISOString(),
}) {
  if (!order) throw new Error("No se encontró la orden solicitada.");

  const effectiveFolio = folio || order.folio || null;
  const { pdfDoc, page, fonts, cursorY: startY } = await createBasePdf({
    title: "Orden clínica",
    subtitle: order.tipo ? `Tipo · ${order.tipo}` : "Orden de estudios / referencia",
    folio: effectiveFolio,
    generatedAt,
  });

  const width = page.getWidth();
  const maxWidth = width - PAGE.MARGIN * 2;
  let y = startY;

  const patientName =
    `${patient?.firstName ?? ""} ${patient?.lastName ?? ""}`.trim() ||
    order.patientName ||
    "Paciente";
  const patientCurp = patient?.curp || order.patientCurp || "—";
  const patientAge = computeAge(patient?.birthDate || order.patientBirthDate);
  const issued = formatDateISOToHuman(order.createdAt || generatedAt);

  y = drawKeyValues(
    page,
    [
      ["Paciente", patientName],
      ["Edad", patientAge],
      ["CURP", patientCurp],
      ["Emitida", issued],
      ["Profesional", professional?.name || "—"],
      ["Cédula", professional?.license || "—"],
    ],
    { fonts, x: PAGE.MARGIN, y, columnWidth: maxWidth / 2 }
  );
  y -= 6;

  // Tipo de orden destacado
  if (order.tipo) {
    page.drawRectangle({
      x: PAGE.MARGIN - 10,
      y: y - 28,
      width: maxWidth + 20,
      height: 32,
      color: COLOR.LILAC,
      opacity: 0.25,
    });
    page.drawText(order.tipo, {
      x: PAGE.MARGIN,
      y: y - 18,
      font: fonts.bold,
      size: TYPE.H2,
      color: COLOR.INK,
    });
    y -= 48;
  }

  y = drawSection(page, {
    title: "Descripción",
    body: order.descripcion || "Sin descripción.",
    fonts,
    x: PAGE.MARGIN,
    y,
    maxWidth,
  });

  if (order.indicaciones) {
    y = drawSection(page, {
      title: "Indicaciones",
      body: order.indicaciones,
      fonts,
      x: PAGE.MARGIN,
      y,
      maxWidth,
    });
  }

  const hashFull = await sha256(
    canonicalize({
      folio: effectiveFolio,
      tipo: order.tipo,
      descripcion: order.descripcion,
      indicaciones: order.indicaciones,
      emitida: order.createdAt || generatedAt,
    })
  );

  return finalizePdf(pdfDoc, fonts, {
    folio: effectiveFolio,
    professional,
    sha256: hashFull,
  });
}

export async function downloadOrderPdf(config) {
  const patientId = config?.patient?.id || config?.order?.patientId;
  const sourceId = config?.order?.id;
  const title = config?.order?.tipo || "Orden clínica";

  return generateAndRegister({
    type: "ORDER",
    patientId,
    sourceId,
    title,
    filename: `orden_${config?.order?.folio || "documento"}.pdf`,
    render: (folio) => generateOrderPdf({ ...config, folio: folio || config?.order?.folio }),
  });
}

export default {
  generateOrderPdf,
  downloadOrderPdf,
};
