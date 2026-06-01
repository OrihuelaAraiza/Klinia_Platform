import {
  createBasePdf,
  finalizePdf,
  drawWrapped,
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

/**
 * Genera el PDF de prescripción usando la plantilla base unificada.
 */
export async function generatePrescriptionPdf({
  prescription,
  patient,
  professional,
  folio,
  generatedAt = new Date().toISOString(),
}) {
  if (!prescription) throw new Error("No se encontró la prescripción solicitada.");

  const effectiveFolio = folio || prescription.folio || null;
  const { pdfDoc, page, fonts, cursorY: startY } = await createBasePdf({
    title: "Prescripción electrónica",
    subtitle: "Conforme a NOM-024-SSA3 — Uso clínico controlado.",
    folio: effectiveFolio,
    generatedAt,
  });

  const width = page.getWidth();
  const maxWidth = width - PAGE.MARGIN * 2;
  let y = startY;

  // Datos de paciente y profesional en 2 columnas
  const patientName =
    `${patient?.firstName ?? ""} ${patient?.lastName ?? ""}`.trim() ||
    prescription.patientName ||
    "Paciente";
  const patientCurp = patient?.curp || prescription.patientCurp || "—";
  const patientAge = computeAge(patient?.birthDate || prescription.patientBirthDate);
  const issued = formatDateISOToHuman(prescription.createdAt || generatedAt);

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

  // Sección de medicamento — un card-like con fondo butter suave
  page.drawRectangle({
    x: PAGE.MARGIN - 12,
    y: y - 6 - 130,
    width: maxWidth + 24,
    height: 130,
    color: COLOR.YELLOW,
    opacity: 0.18,
  });
  page.drawRectangle({
    x: PAGE.MARGIN - 12,
    y: y - 6 - 132,
    width: maxWidth + 24,
    height: 2,
    color: COLOR.INK,
  });

  page.drawText("Medicamento prescrito", {
    x: PAGE.MARGIN,
    y,
    font: fonts.bold,
    size: TYPE.H2,
    color: COLOR.INK,
  });
  y -= LH.H2;

  const detailEntries = [
    ["Principio activo", prescription.substance],
    ["Forma", prescription.form],
    ["Dosis", prescription.dose],
    ["Vía", prescription.route],
    ["Frecuencia", prescription.frequency],
    ["Duración", prescription.duration],
  ];
  y = drawKeyValues(page, detailEntries, { fonts, x: PAGE.MARGIN, y, columnWidth: maxWidth / 2 });
  y -= 6;

  if (prescription.notes) {
    y = drawSection(page, {
      title: "Indicaciones",
      body: prescription.notes,
      fonts,
      x: PAGE.MARGIN,
      y,
      maxWidth,
    });
  }

  // Sello SHA-256 del payload clínico
  const hashFull = await sha256(
    canonicalize({
      folio: effectiveFolio,
      fecha: prescription.createdAt || generatedAt,
      principioActivo: prescription.substance,
      dosis: prescription.dose,
      frecuencia: prescription.frequency,
      duracion: prescription.duration,
      indicaciones: prescription.notes || "",
    })
  );

  return finalizePdf(pdfDoc, fonts, {
    folio: effectiveFolio,
    professional,
    sha256: hashFull,
  });
}

/**
 * Descarga el PDF de la prescripción Y lo registra como documento del paciente.
 * Si patientId está disponible, el PDF aparecerá en la lista de documentos.
 */
export async function downloadPrescriptionPdf(config) {
  const patientId = config?.patient?.id || config?.prescription?.patientId;
  const sourceId = config?.prescription?.id;
  const title = config?.prescription?.substance || "Prescripción";

  return generateAndRegister({
    type: "PRESCRIPTION",
    patientId,
    sourceId,
    title,
    filename: `prescripcion_${config?.prescription?.folio || "documento"}.pdf`,
    render: (folio) =>
      generatePrescriptionPdf({ ...config, folio: folio || config?.prescription?.folio }),
  });
}

export default {
  generatePrescriptionPdf,
  downloadPrescriptionPdf,
};
