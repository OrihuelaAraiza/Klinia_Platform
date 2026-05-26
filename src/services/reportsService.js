import { api } from "./apiClient";
import { canonicalize, sha256 } from "../utils/export/composeRecord";

/**
 * Reportes contra klinia-api.
 *
 * Modelo unificado:
 *   { id, folio, patientId, professionalId, template, data, status,
 *     pdfHash, verificationCode, createdAt, updatedAt, signedAt }
 *
 * NOTA: PDF y bundle export se mantienen del lado del cliente con composeRecord
 * porque no hay endpoints equivalentes todavía en el backend.
 */

export async function create(payload) {
  if (payload?.patientId) {
    return api.post(`/patients/${payload.patientId}/reports`, payload);
  }
  return api.post("/reports", payload);
}

export async function listAll(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  });
  const tail = qs.toString();
  return api.get(`/reports${tail ? `?${tail}` : ""}`);
}

export async function listByPatient(patientId) {
  if (!patientId) return [];
  return api.get(`/patients/${patientId}/reports`);
}

export async function getOne(id) {
  return api.get(`/reports/${id}`);
}

export async function update(reportId, patch) {
  return api.put(`/reports/${reportId}`, patch);
}

/**
 * Firma el reporte: pide al backend marcar como cerrado.
 * Si el backend no calcula hash, lo computamos aquí para mostrar el sello
 * (sigue siendo "demo only", como en la versión mock).
 */
export async function sign(reportId) {
  const report = await getOne(reportId).catch(() => null);
  let pdfHash = report?.pdfHash;
  if (!pdfHash && report) {
    try {
      const canonical = canonicalize(report.data || {});
      pdfHash = await sha256(canonical);
    } catch {
      pdfHash = "";
    }
  }
  return api.post(`/reports/${reportId}/sign`, { pdfHash });
}

export const lock = sign;

/**
 * Bundle/exports: lecturas multi-recurso del paciente.
 * Las dejamos como composición client-side reusando endpoints existentes,
 * para no esperar a que el backend tenga /export.
 */
export async function fetchPatientBundle(patientId) {
  if (!patientId) return null;
  const [patient, history, notes, prescriptions, sessions, reports] = await Promise.all([
    api.get(`/patients/${patientId}`).catch(() => null),
    api.get(`/histories?patientId=${patientId}`).catch(() => null),
    api.get(`/patients/${patientId}/notes`).catch(() => ({ items: [] })),
    api.get(`/patients/${patientId}/prescriptions`).catch(() => []),
    api.get(`/patients/${patientId}/sessions`).catch(() => ({ items: [] })),
    api.get(`/patients/${patientId}/reports`).catch(() => []),
  ]);
  return {
    patient,
    history: Array.isArray(history?.items) ? history.items[0] : history,
    notes: notes?.items || notes || [],
    prescriptions: Array.isArray(prescriptions) ? prescriptions : prescriptions?.items || [],
    sessions: sessions?.items || sessions || [],
    reports: Array.isArray(reports) ? reports : reports?.items || [],
  };
}

export async function exportPatientRecordJson(patientId) {
  const bundle = await fetchPatientBundle(patientId);
  if (!bundle) return null;
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `expediente-${patientId}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return bundle;
}

export async function exportHistoryPdf(patientId, overrides = {}) {
  const generateHistoryPdf = (await import("../utils/export/pdf/historyPdf")).default;
  const bundle = await fetchPatientBundle(patientId);
  return generateHistoryPdf({ ...bundle, ...overrides });
}

export async function exportNotePdf(patientId, note, overrides = {}) {
  const generateNotePdf = (await import("../utils/export/pdf/notePdf")).default;
  return generateNotePdf({ note, patientId, ...overrides });
}

export default {
  create,
  listAll,
  listByPatient,
  getOne,
  update,
  sign,
  lock,
  fetchPatientBundle,
  exportPatientRecordJson,
  exportHistoryPdf,
  exportNotePdf,
};
