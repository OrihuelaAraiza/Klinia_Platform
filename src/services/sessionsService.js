import { api } from "./apiClient";

export async function listSessions({ q = "", from, to, status, professionalId, page = 1, size = 10 } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (status) params.set("status", status);
  if (professionalId) params.set("professionalId", professionalId);
  if (page) params.set("page", String(page));
  if (size) params.set("size", String(size));
  const qs = params.toString();
  return api.get(`/sessions${qs ? `?${qs}` : ""}`);
}

export async function listSessionsByPatient(patientId, { page = 1, size = 10 } = {}) {
  if (!patientId) return { items: [], total: 0, page, size };
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (size) params.set("size", String(size));
  const qs = params.toString();
  return api.get(`/patients/${patientId}/sessions${qs ? `?${qs}` : ""}`);
}

export const listByPatient = listSessionsByPatient;

export async function createSession(payload) {
  if (payload?.patientId) {
    return api.post(`/patients/${payload.patientId}/sessions`, payload);
  }
  return api.post("/sessions", payload);
}

export async function updateSession(id, payload) {
  return api.put(`/sessions/${id}`, payload);
}

export async function changeStatus(id, statusOrPayload) {
  const body = typeof statusOrPayload === "string"
    ? { status: statusOrPayload }
    : { status: statusOrPayload?.status || statusOrPayload };
  return api.put(`/sessions/${id}/status`, body);
}

export async function linkNote(id, noteId) {
  return api.put(`/sessions/${id}/link-note`, { noteId });
}

export async function getTodayCounts() {
  return api.get("/sessions/today-counts");
}

export async function exportIcs(id) {
  // El endpoint devuelve text/calendar; el browser lo descarga
  if (typeof window === "undefined") return;
  window.open(
    `${(import.meta.env.VITE_API_URL || "http://localhost:4000/api")}/sessions/${id}/ics`,
    "_blank"
  );
}

export async function getOne(id) {
  return api.get(`/sessions/${id}`);
}

export default {
  listSessions,
  listSessionsByPatient,
  listByPatient,
  createSession,
  updateSession,
  changeStatus,
  linkNote,
  getTodayCounts,
  exportIcs,
  getOne,
};
