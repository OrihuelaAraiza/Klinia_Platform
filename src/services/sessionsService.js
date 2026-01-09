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

export async function listSessions({
  q,
  from,
  to,
  status,
  professionalId,
  page = 1,
  size = 10
} = {}, options = {}) {
  const query = buildQuery({ q, from, to, status, professionalId, page, size });

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
  try {
    const url = `/sessions/patient/${patientId}?page=${page}&size=${size}`;
    
    const response = await api.get(url, { auth: true, ...options });

    const items = Array.isArray(response) ? response : (response?.items || []);
    
    return {
      items: items.map(session => ({
        ...session,
        professionalName: session.professional?.name || "Especialista"
      })),
      total: Number(response?.total ?? items.length ?? 0),
      page: Number(response?.page ?? page),
      size: Number(response?.size ?? size),
    };
  } catch (error) {
    console.error("Error en listSessionsByPatient:", error);
    throw error;
  }
}

export function createSession(payload, options = {}) {
  return api.post("/sessions", payload, options);
}

export function updateSession(id, payload, options = {}) {
  return api.put(`/sessions/${id}`, payload, options);
}


export function linkNote(id, noteId, options = {}) {
  return api.put(`/sessions/${id}/link-note`, { noteId }, options);
}

export function listByPatient(patientId, params, options) {
  return listSessionsByPatient(patientId, params, options);
}

export function getTodayCounts(options = {}) {
  return api.get("/sessions/today-counts", options);
}

export async function exportIcs(id) {
  const response = await api.get(`/sessions/${id}/ics`, {
    responseType: "blob",
  });

  const blob = new Blob([response.data], { type: "text/calendar;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sesion-${id}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}


export function changeStatus(id, payload, options = {}) {
  return api.put(`/sessions/${id}/status`, payload, options);
}


export function getOne(id, options = {}) {
  return api.get(`/sessions/${id}`, options);
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