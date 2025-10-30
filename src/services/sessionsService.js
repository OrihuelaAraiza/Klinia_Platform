import { api } from "./apiClient";

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    query.set(key, value);
  });
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

async function safeGet(url, options) {
  try {
    return await api.get(url, options);
  } catch (error) {
    if (error?.status === 404) {
      return { items: [], total: 0, page: 1, size: 10 };
    }
    throw error;
  }
}

export async function listSessions({ q, from, to, status, page = 1, size = 10 } = {}, options = {}) {
  const query = buildQuery({ q, from, to, status, page, size });
  const response = await safeGet(`/sessions${query}`, options);
  if (Array.isArray(response)) {
    return { items: response, total: response.length, page, size };
  }
  return {
    items: Array.isArray(response?.items) ? response.items : [],
    total: Number(response?.total ?? 0),
    page: Number(response?.page ?? page),
    size: Number(response?.size ?? size),
  };
}

export async function listSessionsByPatient(patientId, { page = 1, size = 10 } = {}, options = {}) {
  const query = buildQuery({ page, size });
  const response = await safeGet(`/patients/${patientId}/sessions${query}`, options);
  if (Array.isArray(response)) {
    return { items: response, total: response.length, page, size };
  }
  return {
    items: Array.isArray(response?.items) ? response.items : [],
    total: Number(response?.total ?? 0),
    page: Number(response?.page ?? page),
    size: Number(response?.size ?? size),
  };
}

export function createSession(payload, options = {}) {
  return api.post("/sessions", payload, options);
}

export function updateSession(id, payload, options = {}) {
  return api.put(`/sessions/${id}`, payload, options);
}

export function changeStatus(id, status, options = {}) {
  return api.put(`/sessions/${id}/status`, { status }, options);
}

export function linkNote(id, noteId, options = {}) {
  return api.put(`/sessions/${id}/link-note`, { noteId }, options);
}

export default {
  listSessions,
  listSessionsByPatient,
  createSession,
  updateSession,
  changeStatus,
  linkNote,
};
