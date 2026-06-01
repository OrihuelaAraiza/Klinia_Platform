import { api } from "./apiClient";

export const HISTORY_TYPE_LABEL = {
  PSICOLOGICA: "Historia psicológica",
  PSIQUIATRICA: "Historia psiquiátrica",
  PSICOTERAPEUTICA: "Registro psicoterapéutico",
};

export const HISTORY_TYPE_SUBTITLE = {
  PSICOLOGICA: "Evaluación integral del funcionamiento y la personalidad",
  PSIQUIATRICA: "Valoración médico-psiquiátrica, examen mental y plan",
  PSICOTERAPEUTICA: "Encuadre, plan de tratamiento y notas de proceso",
};

export const SPECIALTY_TO_HISTORY_TYPE = {
  PSICOLOGO: "PSICOLOGICA",
  PSIQUIATRA: "PSIQUIATRICA",
  PSICOTERAPEUTA: "PSICOTERAPEUTICA",
};

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

/**
 * Lista todas las historias clínicas del paciente, agrupadas por tipo.
 * Cualquier rol vinculado al paciente puede leer las 3 (psicológica,
 * psiquiátrica y psicoterapéutica) aunque pertenezcan a otros profesionales.
 *
 * @returns {Promise<{ all: Array, byType: Record<string, any> }>}
 */
export async function listAllHistories(patientId) {
  if (!patientId) return { all: [], byType: {} };
  try {
    return await api.get(`/histories/patient/${patientId}/all`);
  } catch (err) {
    if (err.status === 404) return { all: [], byType: {} };
    return { all: [], byType: {} };
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
  listAllHistories,
  HISTORY_TYPE_LABEL,
  HISTORY_TYPE_SUBTITLE,
  SPECIALTY_TO_HISTORY_TYPE,
};
