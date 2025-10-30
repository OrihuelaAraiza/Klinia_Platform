import { api } from "./apiClient";

export async function listNotes(patientId, { page = 1, size = 10 } = {}, options = {}) {
  const response = await api.get(`/patients/${patientId}/notes?page=${page}&size=${size}`, options);

  if (Array.isArray(response)) {
    return {
      items: response,
      page,
      size,
      total: response.length,
    };
  }

  const items = Array.isArray(response?.items) ? response.items : [];
  return {
    items,
    page: Number(response?.page ?? page),
    size: Number(response?.size ?? size),
    total: Number(response?.total ?? items.length),
  };
}

export function getNote(patientId, noteId, options = {}) {
  return api.get(`/patients/${patientId}/notes/${noteId}`, options);
}

export function createNote(patientId, payload, options = {}) {
  return api.post(`/patients/${patientId}/notes`, payload, options);
}

export function closeNote(patientId, noteId, options = {}) {
  return api.put(`/patients/${patientId}/notes/${noteId}/close`, {}, options);
}

export function addAddendum(patientId, noteId, text, options = {}) {
  return api.put(`/patients/${patientId}/notes/${noteId}/addendum`, { text }, options);
}

export default {
  listNotes,
  getNote,
  createNote,
  closeNote,
  addAddendum,
};
