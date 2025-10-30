import { api } from "./apiClient";

export function getHistory(patientId, options = {}) {
  return api.get(`/patients/${patientId}/history`, options);
}

export function createHistory(patientId, payload, options = {}) {
  return api.post(`/patients/${patientId}/history`, payload, options);
}

export default {
  getHistory,
  createHistory,
};
