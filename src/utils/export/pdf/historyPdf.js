import {
  createBasePdf,
  finalizePdf,
  drawSection,
  drawKeyValues,
  drawWrapped,
  addContinuationPage,
  bottomLimit,
  PAGE,
  TYPE,
  LH,
  COLOR,
} from "./basePdfTemplate";
import { generateAndRegister } from "./triggerAndRegister";
import { canonicalize, sha256 } from "../composeRecord";
import { formatDateISOToHuman } from "../../formatters";

/**
 * Genera el PDF de Historia Clínica usando la plantilla base unificada.
 */
export async function generateHistoryPdf({
  patient,
  history,
  prescriptions = [],
  folio,
  generatedAt = new Date().toISOString(),
}) {
  if (!history) throw new Error("No hay historia clínica registrada para este paciente.");

  const effectiveFolio = folio || history.folio || null;
  const baseTitle = "Historia Clínica";
  const subtitle = "Expediente clínico estructurado — NOM-004-SSA3";

  const { pdfDoc, page, fonts, cursorY: startY } = await createBasePdf({
    title: baseTitle,
    subtitle,
    folio: effectiveFolio,
    generatedAt,
  });

  const width = page.getWidth();
  const maxWidth = width - PAGE.MARGIN * 2;
  let currentPage = page;
  let y = startY;

  const patientName = `${patient?.firstName ?? ""} ${patient?.lastName ?? ""}`.trim() || "—";
  const curp = patient?.curp || "—";
  const historyDate = history.createdAt
    ? formatDateISOToHuman(history.createdAt)
    : formatDateISOToHuman(generatedAt);

  y = drawKeyValues(
    currentPage,
    [
      ["Paciente", patientName],
      ["CURP", curp],
      ["Registro", historyDate],
      ["Responsable", history.professional?.name || "—"],
    ],
    { fonts, x: PAGE.MARGIN, y, columnWidth: maxWidth / 2 }
  );
  y -= 4;

  const sections = [
    ["Motivo de consulta", history.motive],
    ["Antecedentes psicosociales", history.psychosocialBackground],
    ["Hábitos alimenticios", history.dietaryHabits],
    ["Actividad física", history.physicalActivity],
    ["Patrón de sueño", history.sleepPatterns],
    ["Tratamientos previos", history.previousTreatments],
    ["Examen mental", history.mentalStatusExam],
  ];

  const dxList = Array.isArray(history.diagnoses) && history.diagnoses.length
    ? history.diagnoses.map((dx) => `${dx.code} — ${dx.label}`).join("\n")
    : "Sin diagnósticos registrados.";
  sections.push(["Diagnósticos (CIE-10/CIE-11)", dxList]);
  sections.push(["Objetivos terapéuticos", history.goals]);
  sections.push(["Plan terapéutico", history.therapeuticPlan]);

  function pageBreakIfNeeded(reserve = LH.H2 + LH.BODY * 3) {
    if (y < bottomLimit() + reserve) {
      const cont = addContinuationPage(pdfDoc, fonts, {
        title: baseTitle,
        subtitle,
        folio: effectiveFolio,
        generatedAt,
      });
      currentPage = cont.page;
      y = cont.cursorY;
    }
  }

  for (const [title, body] of sections) {
    pageBreakIfNeeded();
    y = drawSection(currentPage, {
      title,
      body,
      fonts,
      x: PAGE.MARGIN,
      y,
      maxWidth,
    });
  }

  // Sección de prescripciones (resumen)
  pageBreakIfNeeded(LH.H2 + LH.BODY * 6);
  currentPage.drawText("Prescripciones registradas", {
    x: PAGE.MARGIN,
    y,
    font: fonts.bold,
    size: TYPE.H2,
    color: COLOR.INK,
  });
  y -= LH.H2;

  if (Array.isArray(prescriptions) && prescriptions.length) {
    const recent = prescriptions.slice(0, 6);
    for (const item of recent) {
      pageBreakIfNeeded();
      currentPage.drawText(`${item.folio || "RX"} · ${formatDateISOToHuman(item.createdAt)}`, {
        x: PAGE.MARGIN,
        y,
        font: fonts.bold,
        size: TYPE.BODY,
        color: COLOR.INK,
      });
      y -= LH.BODY;
      const detail = `${item.substance || "—"}  ·  ${item.dose || "—"}  ·  ${item.frequency || "—"}`;
      y = drawWrapped(currentPage, detail, {
        x: PAGE.MARGIN,
        y,
        font: fonts.regular,
        size: TYPE.BODY,
        color: COLOR.INK_SOFT,
        maxWidth,
      });
      y -= 4;
    }
    if (prescriptions.length > recent.length) {
      currentPage.drawText(
        `+${prescriptions.length - recent.length} prescripciones adicionales registradas.`,
        {
          x: PAGE.MARGIN,
          y,
          font: fonts.italic,
          size: TYPE.SMALL,
          color: COLOR.MUTED,
        }
      );
      y -= LH.BODY;
    }
  } else {
    currentPage.drawText("Sin prescripciones registradas.", {
      x: PAGE.MARGIN,
      y,
      font: fonts.regular,
      size: TYPE.BODY,
      color: COLOR.MUTED,
    });
    y -= LH.BODY;
  }

  const hash = await sha256(
    canonicalize({
      folio: effectiveFolio,
      patient: { id: patient?.id, curp: patient?.curp },
      motive: history.motive,
      diagnoses: history.diagnoses,
      generatedAt,
    })
  );

  return finalizePdf(pdfDoc, fonts, {
    folio: effectiveFolio,
    professional: history.professional,
    sha256: hash,
  });
}

/**
 * Helper: descarga la historia clínica y registra el documento.
 */
export async function downloadHistoryPdf(config) {
  const patientId = config?.patient?.id;
  const title = "Historia clínica";
  return generateAndRegister({
    type: "HISTORY",
    patientId,
    sourceId: config?.history?.id,
    title,
    filename: `historia_${patientId || "documento"}.pdf`,
    render: (folio) => generateHistoryPdf({ ...config, folio }),
  });
}

export default generateHistoryPdf;
