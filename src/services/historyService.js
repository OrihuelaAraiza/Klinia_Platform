import { api } from "./apiClient";

export async function getHistory(patientId) {
  if (!patientId) return null;
  try {
    return await api.get(`/histories/${patientId}`);
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

export async function createHistory(patientId, payload) {
  return api.put(`/histories/${patientId}`, payload);
}

export async function getHistoryForProfessional(patientId) {
  return getHistory(patientId);
}

export default { getHistory, createHistory, getHistoryForProfessional };
