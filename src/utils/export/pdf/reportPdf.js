import {
  createBasePdf,
  finalizePdf,
  drawSection,
  drawKeyValues,
  drawWrapped,
  PAGE,
  TYPE,
  LH,
  COLOR,
} from "./basePdfTemplate";
import { generateAndRegister } from "./triggerAndRegister";
import { getTemplate } from "../../../config/clinicalSchemas/reports";
import { generateSchemaReportPdf } from "./schemaReportPdf";
import { formatDateISOToHuman } from "../../formatters";

/**
 * Reporte LIBRE (texto sin estructura). Los templates tipados se rendea con
 * generateSchemaReportPdf — pero ese también será actualizado para usar la base.
 */
async function generateLibrePdf({ report, patient, generatedAt, folio }) {
  const data = report.data || {};
  const effectiveFolio = folio || report.folio || null;
  const { pdfDoc, page, fonts, cursorY: startY } = await createBasePdf({
    title: data.title || "Reporte clínico",
    subtitle: "Reporte libre — Texto sin estructura formal.",
    folio: effectiveFolio,
    generatedAt,
  });

  const width = page.getWidth();
  const maxWidth = width - PAGE.MARGIN * 2;
  let y = startY;

  const patientName =
    `${patient?.firstName ?? ""} ${patient?.lastName ?? ""}`.trim() || "Paciente";
  const emittedAt = formatDateISOToHuman(report.signedAt || generatedAt);

  y = drawKeyValues(
    page,
    [
      ["Paciente", patientName],
      ["CURP", patient?.curp || "—"],
      ["Emitido", emittedAt],
      ["Estado", report.status === "cerrado" ? "Cerrado" : "Borrador"],
    ],
    { fonts, x: PAGE.MARGIN, y, columnWidth: maxWidth / 2 }
  );
  y -= 4;

  y = drawSection(page, {
    title: data.title || "Contenido del reporte",
    body: data.content || "—",
    fonts,
    x: PAGE.MARGIN,
    y,
    maxWidth,
  });

  if (report.verificationCode) {
    page.drawText(`Código de verificación: ${report.verificationCode}`, {
      x: PAGE.MARGIN,
      y: y - 4,
      font: fonts.bold,
      size: TYPE.SMALL,
      color: COLOR.INK,
    });
  }

  return finalizePdf(pdfDoc, fonts, {
    folio: effectiveFolio,
    professional: report.professional,
    sha256: report.pdfHash,
  });
}

export async function generateReportPdf({
  report,
  patient,
  folio,
  generatedAt = new Date().toISOString(),
}) {
  if (!report || !patient) throw new Error("Reporte y paciente requeridos.");

  const template = getTemplate(report.template);
  if (template && template.id !== "LIBRE" && Array.isArray(template.sections) && template.sections.length > 0) {
    return generateSchemaReportPdf({ template, report, patient, folio, generatedAt });
  }
  return generateLibrePdf({ report, patient, generatedAt, folio });
}

export async function downloadReportPdf(config) {
  const patientId = config?.patient?.id || config?.report?.patientId;
  const sourceId = config?.report?.id;
  const title = config?.report?.data?.title || `Reporte ${config?.report?.template || ""}`.trim();

  return generateAndRegister({
    type: "REPORT",
    patientId,
    sourceId,
    title,
    filename: `reporte_${config?.report?.folio || config?.report?.id || "documento"}.pdf`,
    render: (folio) => generateReportPdf({ ...config, folio: folio || config?.report?.folio }),
  });
}

export default { generateReportPdf, downloadReportPdf };
