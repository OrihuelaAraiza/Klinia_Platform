import { Router } from "express";
import PDFDocument from "pdfkit";
import { composeRecord } from "../utils/export.js";
import {
  patients,
  historiesByPatient,
  notesByPatient,
  pushAuditEvent,
} from "../store/memory.js";

function sendNotFound(res, message) {
  return res.status(404).json({ message });
}

function section(doc, title) {
  doc.moveDown(0.5).fontSize(13).fillColor("#0b1220").text(title, { underline: true });
  doc.moveDown(0.1).fontSize(11).fillColor("#1a1a1a");
}

function finalizePdf(doc, res) {
  doc.pipe(res);
  doc.end();
}

const router = Router({ mergeParams: true });

router.get("/json", (req, res, next) => {
  try {
    const { id } = req.params;
    if (!patients.get(id)) {
      return sendNotFound(res, "Patient not found");
    }

    const record = composeRecord(id);
    if (!record) {
      return sendNotFound(res, "Patient not found");
    }

    const payload = JSON.stringify(record, null, 2);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="expediente_${id}.json"`);
    res.status(200).send(payload);
    pushAuditEvent({
      event: "export_json",
      meta: { patientId: id },
      at: new Date().toISOString(),
    });
    return null;
  } catch (error) {
    next(error);
    return null;
  }
});

router.get("/history.pdf", (req, res, next) => {
  try {
    const { id } = req.params;
    const patient = patients.get(id);
    if (!patient) {
      return sendNotFound(res, "Patient not found");
    }
    const history = historiesByPatient.get(id);
    if (!history) {
      return sendNotFound(res, "History not found");
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="historia_${id}.pdf"`);

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    doc.info.Title = `Historia Clínica — ${patient.firstName ?? ""} ${patient.lastName ?? ""}`;

    doc.fontSize(16).fillColor("#0b1220").text("Historia Clínica (PMV Klinia)", { align: "center" }).moveDown();
    doc.fontSize(11).fillColor("#1a1a1a");
    doc.text(`Paciente: ${patient.firstName ?? ""} ${patient.lastName ?? ""}`);
    doc.text(`CURP: ${patient.curp ?? "—"}`);
    doc.text(`Generado: ${new Date().toLocaleString("es-MX")}`).moveDown();

    section(doc, "Motivo de consulta");
    doc.text(history.motive || "—");

    section(doc, "Antecedentes psicosociales");
    doc.text(history.psychosocialBackground || "—");

    section(doc, "Examen mental");
    doc.text(history.mentalStatusExam || "—");

    section(doc, "Diagnósticos (CIE-10)");
    if (Array.isArray(history.diagnoses) && history.diagnoses.length) {
      history.diagnoses.forEach((diagnosis) => {
        doc.text(`• ${diagnosis.code} — ${diagnosis.label}`);
      });
    } else {
      doc.text("—");
    }

    section(doc, "Objetivos terapéuticos");
    doc.text(history.goals || "—");

    section(doc, "Plan terapéutico");
    doc.text(history.therapeuticPlan || "—");

    section(doc, "Profesional responsable");
    doc.text(history.professional?.name || "—");

    doc.moveDown().fontSize(9).fillColor("#555555").text(
      "Documento generado por Klinia (PMV). No sustituye firma autógrafa.",
      { align: "center" }
    );

    finalizePdf(doc, res);
    pushAuditEvent({
      event: "export_pdf_history",
      meta: { patientId: id },
      at: new Date().toISOString(),
    });
    return null;
  } catch (error) {
    next(error);
    return null;
  }
});

router.get("/notes/:noteId.pdf", (req, res, next) => {
  try {
    const { id, noteId } = req.params;
    const patient = patients.get(id);
    if (!patient) {
      return sendNotFound(res, "Patient not found");
    }

    const notes = notesByPatient.get(id) || [];
    const note = notes.find((entry) => entry.id === noteId);
    if (!note) {
      return sendNotFound(res, "Note not found");
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="nota_${noteId}.pdf"`);

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    doc.info.Title = `Nota de Evolución — ${patient.firstName ?? ""} ${patient.lastName ?? ""}`;

    doc.fontSize(16).fillColor("#0b1220").text("Nota de Evolución (PMV Klinia)", { align: "center" }).moveDown();
    doc.fontSize(11).fillColor("#1a1a1a");
    doc.text(`Paciente: ${patient.firstName ?? ""} ${patient.lastName ?? ""}`);
    doc.text(`CURP: ${patient.curp ?? "—"}`);
    doc.text(`Fecha / Hora: ${note.datetime || "—"}`);
    doc.text(`Estado: ${note.status}${note.closedAt ? ` (cerrada el ${note.closedAt})` : ""}`).moveDown();

    section(doc, "Subjetivo (S)");
    doc.text(note.subjective || "—");

    section(doc, "Objetivo (O)");
    doc.text(note.objective || "—");

    section(doc, "Análisis (A)");
    doc.text(note.analysis || "—");

    section(doc, "Plan (P)");
    doc.text(note.plan || "—");

    section(doc, "Diagnósticos (CIE-10)");
    if (Array.isArray(note.diagnoses) && note.diagnoses.length) {
      note.diagnoses.forEach((diagnosis) => {
        doc.text(`• ${diagnosis.code} — ${diagnosis.label}`);
      });
    } else {
      doc.text("—");
    }

    const addenda = note.addenda || [];
    if (addenda.length) {
      section(doc, "Addenda");
      addenda.forEach((entry) => {
        doc.text(`• ${entry.datetime || "—"} — ${entry.author || "Profesional"}: ${entry.text || ""}`);
      });
    }

    doc.moveDown().fontSize(9).fillColor("#555555").text(
      "Documento generado por Klinia (PMV). No sustituye firma autógrafa.",
      { align: "center" }
    );

    finalizePdf(doc, res);
    pushAuditEvent({
      event: "export_pdf_note",
      meta: { patientId: id, noteId },
      at: new Date().toISOString(),
    });
    return null;
  } catch (error) {
    next(error);
    return null;
  }
});

export default router;
