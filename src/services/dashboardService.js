import { api } from "./apiClient";

function normalizeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function ensureArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === null || value === undefined) {
    return [];
  }
  return Array.isArray(value.items) ? value.items : [];
}

export async function getStats(options = {}) {
  const response = await api.get("/dashboard/stats", options);
  return {
    patientsActive: normalizeNumber(response?.patientsActive),
    sessionsToday: normalizeNumber(response?.sessionsToday),
    sessionsCancelledToday: normalizeNumber(response?.sessionsCancelledToday),
    prescriptionsActive: normalizeNumber(response?.prescriptionsActive),
    lastPrescriptionTime: response?.lastPrescriptionTime || null,
    reportsGenerated: normalizeNumber(response?.reportsGenerated),
    reportsProgress: normalizeNumber(response?.reportsProgress),
  };
}

export async function getTodaySessions(options = {}) {
  const response = await api.get("/dashboard/sessions/today", options);
  return ensureArray(response).map((item) => ({
    id: item?.id ?? item?.sessionId ?? null,
    time: item?.time || item?.scheduledAt || null,
    patientName: item?.patientName || item?.patient || "Paciente",
    status: item?.status || null,
  }));
}

export async function getRecentNotes(options = {}) {
  const response = await api.get("/dashboard/notes/recent", options);
  return ensureArray(response).map((item) => ({
    id: item?.id ?? item?.noteId ?? null,
    patientId: item?.patientId ?? null,
    patientName: item?.patientName || "Paciente",
    closedAt: item?.closedAt || item?.updatedAt || null,
  }));
}

export async function getRecentPrescriptions(options = {}) {
  const response = await api.get("/dashboard/prescriptions/recent", options);
  return ensureArray(response).map((item) => ({
    id: item?.id ?? item?.prescriptionId ?? null,
    patientId: item?.patientId ?? null,
    patientName: item?.patientName || "Paciente",
    folio: item?.folio || item?.serial || null,
    signedAt: item?.signedAt || item?.issuedAt || null,
  }));
}

export default {
  getStats,
  getTodaySessions,
  getRecentNotes,
  getRecentPrescriptions,
};
