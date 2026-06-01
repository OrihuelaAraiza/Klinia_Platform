import { api } from "./apiClient";

export async function getClinicalHistory(patientId, options = {}) {
  if (!patientId) return null;
  const profId = options.params?.professionalId;
  const qs = profId ? `?professionalId=${encodeURIComponent(profId)}` : "";
  try {
    return await api.get(`/histories/patient/${patientId}${qs}`);
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

export async function saveClinicalHistory(patientId, payload) {
  if (!payload || Object.keys(payload).length === 0) {
    throw new Error("El formulario está vacío.");
  }
  // Backend usa POST como upsert (insert or update)
  return api.post(`/histories/patient/${patientId}`, payload);
}

export async function getPatientHistory(patientId, professionalId) {
  return getClinicalHistory(patientId, { params: { professionalId } });
}

export default {
  getClinicalHistory,
  saveClinicalHistory,
  getPatientHistory,
};
