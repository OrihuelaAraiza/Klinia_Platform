import { api } from "./apiClient";

export function getHistory(patientId, options = {}) {
  return api.get(`/patients/${patientId}/history`, options);
}

export function createHistory(patientId, payload, options = {}) {
  return api.post(`/patients/${patientId}/history`, payload, options);
}

// src/services/historiesService.js
export async function getHistoryForProfessional(patientId) {
  // El backend usará el token del terapeuta para saber quién pide la historia
  return api.get(`/histories/patient/${patientId}`, { auth: true });
}

export default {
  getHistory,
  createHistory,
  getHistoryForProfessional
};
