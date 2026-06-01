import {
  createBasePdf,
  finalizePdf,
  drawSection,
  drawKeyValues,
  addContinuationPage,
  bottomLimit,
  PAGE,
  TYPE,
  LH,
} from "./basePdfTemplate";
import { generateAndRegister } from "./triggerAndRegister";
import { canonicalize, sha256 } from "../composeRecord";
import { formatDateISOToHuman } from "../../formatters";

export async function generateNotePdf({
  note,
  patient,
  professional,
  folio,
  generatedAt = new Date().toISOString(),
}) {
  if (!note) throw new Error("No se proporcionó una nota clínica para exportar.");

  const effectiveFolio = folio || note.folio || null;
  const subtitle = note.status === "closed"
    ? "Nota cerrada — Inalterable conforme a NOM-004."
    : "Nota de evolución en borrador.";

  const baseTitle = "Nota de evolución";
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
  const noteDate = note.datetime ? formatDateISOToHuman(note.datetime) : "—";

  y = drawKeyValues(
    currentPage,
    [
      ["Paciente", patientName],
      ["CURP", patient?.curp || "—"],
      ["Fecha", noteDate],
      ["Estado", note.status === "closed" ? "Cerrada" : "Borrador"],
    ],
    { fonts, x: PAGE.MARGIN, y, columnWidth: maxWidth / 2 }
  );
  y -= 4;

  const sections = [
    ["Subjetivo (S)", note.subjective],
    ["Objetivo (O)", note.objective],
    ["Análisis (A)", note.analysis],
    ["Plan (P)", note.plan],
  ];

  const dxList = Array.isArray(note.diagnoses) && note.diagnoses.length
    ? note.diagnoses.map((d) => `${d.code} — ${d.label}`).join("\n")
    : "Sin diagnósticos registrados.";
  sections.push(["Diagnósticos", dxList]);

  for (const [title, body] of sections) {
    // Salto de página si no queda espacio
    if (y < bottomLimit() + LH.H2 + LH.BODY * 3) {
      const cont = addContinuationPage(pdfDoc, fonts, {
        title: baseTitle,
        subtitle,
        folio: effectiveFolio,
        generatedAt,
      });
      currentPage = cont.page;
      y = cont.cursorY;
    }
    y = drawSection(currentPage, {
      title,
      body,
      fonts,
      x: PAGE.MARGIN,
      y,
      maxWidth,
    });
  }

  // Addendums
  const addenda = Array.isArray(note.addenda ?? note.addendums)
    ? note.addenda ?? note.addendums
    : [];
  if (addenda.length) {
    const body = addenda
      .map((item) => {
        const date = item.datetime ? formatDateISOToHuman(item.datetime) : "";
        return `${date} — ${item.author ?? "Autor desconocido"}: ${item.text ?? ""}`;
      })
      .join("\n");
    if (y < bottomLimit() + LH.H2 * 3) {
      const cont = addContinuationPage(pdfDoc, fonts, {
        title: baseTitle,
        subtitle,
        folio: effectiveFolio,
        generatedAt,
      });
      currentPage = cont.page;
      y = cont.cursorY;
    }
    y = drawSection(currentPage, {
      title: "Addendums",
      body,
      fonts,
      x: PAGE.MARGIN,
      y,
      maxWidth,
    });
  }

  const hash = await sha256(
    canonicalize({
      folio: effectiveFolio,
      noteId: note.id,
      datetime: note.datetime,
      subjective: note.subjective,
      objective: note.objective,
      analysis: note.analysis,
      plan: note.plan,
    })
  );

  return finalizePdf(pdfDoc, fonts, {
    folio: effectiveFolio,
    professional: note.professional || professional,
    sha256: hash,
  });
}

export async function downloadNotePdf(config) {
  const patientId = config?.patient?.id || config?.note?.patientId;
  const sourceId = config?.note?.id;
  const title = config?.note?.datetime
    ? `Nota ${formatDateISOToHuman(config.note.datetime)}`
    : "Nota de evolución";

  return generateAndRegister({
    type: "NOTE",
    patientId,
    sourceId,
    title,
    filename: `nota_${config?.note?.id || "documento"}.pdf`,
    render: (folio) => generateNotePdf({ ...config, folio }),
  });
}

export default generateNotePdf;
