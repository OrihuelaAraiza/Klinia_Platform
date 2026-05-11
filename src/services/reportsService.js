import { db, persist, uid, delay, nowIso } from "./mocks/db";
import { getUser } from "./storage";
import generateHistoryPdf from "../utils/export/pdf/historyPdf";
import generateNotePdf from "../utils/export/pdf/notePdf";

function ensurePatientId(patientId) {
  const normalized = String(patientId || "").trim();
  if (!normalized) throw new Error("Selecciona un paciente válido antes de continuar.");
  return normalized;
}

function ensureId(id) {
  const normalized = String(id || "").trim();
  if (!normalized) throw new Error("Identificador de informe inválido.");
  return normalized;
}

function nextFolio(prefix, store) {
  const year = new Date().getFullYear();
  const count =
    store.reports.filter((r) => (r.folio || "").startsWith(`${prefix}-${year}`)).length + 1;
  return `${prefix}-${year}-${String(count).padStart(4, "0")}`;
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

export async function create(payload) {
  await delay();
  const store = db();
  const user = getUser();
  const report = {
    id: uid("rep"),
    patientId: ensurePatientId(payload?.patientId),
    professionalId: user?.id || "prof_demo_1",
    folio: nextFolio("REP", store),
    title: payload?.title || "Reporte",
    content: payload?.content || "",
    status: "DRAFT",
    progress: 0,
    createdAt: nowIso(),
    ...payload,
  };
  store.reports.push(report);
  persist();
  return report;
}

export async function listByPatient(patientId) {
  await delay();
  const id = ensurePatientId(patientId);
  const store = db();
  return store.reports
    .filter((r) => r.patientId === id)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function getOne(id) {
  await delay();
  const rid = ensureId(id);
  const store = db();
  const r = store.reports.find((x) => x.id === rid);
  if (!r) {
    const err = new Error("Reporte no encontrado.");
    err.status = 404;
    throw err;
  }
  return r;
}

export async function update(reportId, patch) {
  await delay();
  const rid = ensureId(reportId);
  const store = db();
  const idx = store.reports.findIndex((r) => r.id === rid);
  if (idx === -1) {
    const err = new Error("Reporte no encontrado.");
    err.status = 404;
    throw err;
  }
  if (store.reports[idx].status === "LOCKED") {
    const err = new Error("Reporte bloqueado.");
    err.status = 409;
    throw err;
  }
  store.reports[idx] = { ...store.reports[idx], ...patch, id: rid, updatedAt: nowIso() };
  persist();
  return store.reports[idx];
}

export async function lock(reportId) {
  await delay();
  const rid = ensureId(reportId);
  const store = db();
  const r = store.reports.find((x) => x.id === rid);
  if (!r) {
    const err = new Error("Reporte no encontrado.");
    err.status = 404;
    throw err;
  }
  r.status = "LOCKED";
  r.lockedAt = nowIso();
  r.progress = 100;
  persist();
  return r;
}

export async function fetchPatientBundle(patientId, overrides = {}) {
  await delay();
  const id = ensurePatientId(patientId);
  const store = db();
  const patient = store.patients.find((p) => p.id === id) || overrides.patient;
  if (!patient) {
    throw new Error("Datos del paciente requeridos para exportar.");
  }
  return {
    patient,
    history: store.histories[id] || overrides.history || null,
    sessions: store.sessions.filter((s) => s.patientId === id),
    prescriptions: store.prescriptions.filter((r) => r.patientId === id),
    notes: store.notes.filter((n) => n.patientId === id),
    consents: store.consents.filter((c) => c.patientId === id),
  };
}

export async function exportPatientRecordJson(patientId, overrides = {}) {
  const bundle = await fetchPatientBundle(patientId, overrides);
  const { patient, history, sessions, prescriptions, notes, consents } = bundle;
  const exportData = {
    version: "1.0",
    patientData: patient,
    clinicalData: {
      history: history || null,
      sessions: sessions || [],
      prescriptions: prescriptions || [],
      notes: notes || [],
      consents: consents || [],
    },
  };
  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const filename = `expediente_${patient.curp || patient.id}_${new Date().toISOString().split("T")[0]}.json`;
  triggerDownload(blob, filename);
  return blob;
}

export async function exportHistoryPdf(patientId, overrides = {}) {
  const { patient } = overrides;
  if (!patient) throw new Error("Datos del paciente requeridos para exportar.");
  const bundle = await fetchPatientBundle(patientId, overrides);
  const blob = await generateHistoryPdf({
    patient: bundle.patient,
    history: bundle.history,
    prescriptions: bundle.prescriptions,
  });
  const filename = `historia_${patient.curp || patient.id}_${new Date().toISOString().split("T")[0]}.pdf`;
  triggerDownload(blob, filename);
  return blob;
}

export async function exportNotePdf(patientId, note, overrides = {}) {
  const { patient } = overrides;
  if (!patient) throw new Error("Datos del paciente requeridos para exportar.");
  if (!note) throw new Error("Nota requerida para exportar.");
  const blob = await generateNotePdf({ patient, note });
  const filename = `nota_${note.id}_${new Date().toISOString().split("T")[0]}.pdf`;
  triggerDownload(blob, filename);
  return blob;
}

export default {
  create,
  listByPatient,
  getOne,
  update,
  lock,
  exportPatientRecordJson,
  exportHistoryPdf,
  exportNotePdf,
  fetchPatientBundle,
};
