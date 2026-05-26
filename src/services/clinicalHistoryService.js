import { api } from "./apiClient";

export async function getClinicalHistory(patientId, options = {}) {
  if (!patientId) return null;
  const profId = options.params?.professionalId;
  const qs = profId ? `?professionalId=${encodeURIComponent(profId)}` : "";
  try {
    return await api.get(`/histories/${patientId}${qs}`);
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

export async function saveClinicalHistory(patientId, payload) {
  if (!payload || Object.keys(payload).length === 0) {
    throw new Error("El formulario está vacío.");
  }
  return api.put(`/histories/${patientId}`, payload);
}

export async function getPatientHistory(patientId, professionalId) {
  return getClinicalHistory(patientId, { params: { professionalId } });
}

export default {
  getClinicalHistory,
  saveClinicalHistory,
  getPatientHistory,
};
