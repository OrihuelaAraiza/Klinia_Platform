import auditService from "./auditService";
import { getPatient } from "./patientsService";
import { getHistory } from "./historyService";
import { listNotes, getNote } from "./notesService";
import { listConsents } from "./consentsService";
import { composeRecord } from "../utils/export/composeRecord";
import { generateHistoryPdf } from "../utils/export/pdf/historyPdf";
import { generateNotePdf } from "../utils/export/pdf/notePdf";

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

export function downloadJson(filename, object) {
  const json = JSON.stringify(object, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  triggerDownload(blob, filename);
}

export function downloadPdf(filename, blob) {
  triggerDownload(blob, filename);
}

export function auditExport(event, meta) {
  return auditService.logAudit(event, meta);
}

export async function fetchPatientBundle(patientId, overrides = {}) {
  const bundle = {
    patient: overrides.patient || null,
    history: overrides.history || null,
    notes: overrides.notes || null,
    consents: overrides.consents || null,
  };

  if (!bundle.patient) {
    bundle.patient = await getPatient(patientId);
  }

  if (bundle.history === undefined) {
    try {
      bundle.history = await getHistory(patientId);
    } catch (error) {
      if (error?.status === 404) {
        bundle.history = null;
      } else {
        throw error;
      }
    }
  }

  if (!bundle.notes) {
    const notesResponse = await listNotes(patientId, { page: 1, size: 100 });
    bundle.notes = Array.isArray(notesResponse?.items) ? notesResponse.items : [];
  }

  if (!bundle.consents) {
    try {
      bundle.consents = await listConsents(patientId);
    } catch (error) {
      if (error?.status === 404) {
        bundle.consents = [];
      } else {
        throw error;
      }
    }
  }

  return bundle;
}

export async function exportPatientRecordJson(patientId, overrides = {}) {
  const { patient, history, notes, consents } = await fetchPatientBundle(patientId, overrides);
  const record = await composeRecord(patient, history, notes, consents);
  const filename = `expediente_${(patient.curp || patient.id || "paciente").toLowerCase()}.json`;
  downloadJson(filename, record);
  await auditExport("export_json", { patientId: patient.id });
  return record;
}

export async function exportHistoryPdf(patientId, overrides = {}) {
  const { patient, history } = await fetchPatientBundle(patientId, overrides);
  if (!history) {
    throw new Error("No hay historia clínica registrada para este paciente.");
  }
  const blob = await generateHistoryPdf({ patient, history });
  const filename = `historia_${(patient.curp || patient.id || "paciente").toLowerCase()}.pdf`;
  downloadPdf(filename, blob);
  await auditExport("export_pdf_history", { patientId: patient.id });
  return blob;
}

export async function exportNotePdf(patientId, noteOrId, overrides = {}) {
  const { patient } = await fetchPatientBundle(patientId, overrides);
  let note = null;

  if (noteOrId && typeof noteOrId === "object") {
    note = noteOrId;
  } else if (noteOrId) {
    note = await getNote(patientId, noteOrId);
  }

  if (!note) {
    throw new Error("No se encontró la nota solicitada.");
  }

  const blob = await generateNotePdf({ patient, note });
  const filename = `nota_${note.id || "clinica"}.pdf`;
  downloadPdf(filename, blob);
  await auditExport("export_pdf_note", { patientId: patient.id, noteId: note.id });
  return blob;
}

export default {
  downloadJson,
  downloadPdf,
  auditExport,
  fetchPatientBundle,
  exportPatientRecordJson,
  exportHistoryPdf,
  exportNotePdf,
};
