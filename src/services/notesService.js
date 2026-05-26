import { api } from "./apiClient";

export async function listNotes(patientId, params = {}) {
  if (!patientId) return { items: [], total: 0 };
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.size) qs.set("size", String(params.size));
  const tail = qs.toString();
  return api.get(`/patients/${patientId}/notes${tail ? `?${tail}` : ""}`);
}

export async function createNote(patientId, payload) {
  return api.post(`/patients/${patientId}/notes`, payload);
}

export async function getNote(patientId, noteId) {
  // El backend acepta tanto /notes/:id como /patients/:id/notes/:noteId
  return api.get(`/notes/${noteId}`);
}

export async function updateNote(patientId, noteId, payload) {
  return api.put(`/notes/${noteId}`, payload);
}

export async function closeNote(patientId, noteId) {
  return api.post(`/notes/${noteId}/close`, {});
}

export async function signNote(patientId, noteId, signature) {
  return api.post(`/notes/${noteId}/sign`, { signature });
}

export async function addAddendum(patientId, noteId, text) {
  return api.post(`/notes/${noteId}/addendum`, { text });
}

export default {
  listNotes,
  createNote,
  getNote,
  updateNote,
  closeNote,
  signNote,
  addAddendum,
};
