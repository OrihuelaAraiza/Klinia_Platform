import { api } from "./apiClient";
import auditService from "./auditService";

/**
 * Obtener historia clínica de un paciente
 * GET /api/histories/patient/:patientId
 */
export async function getClinicalHistory(patientId) {
  try {
    const response = await api.get(
      `/histories/patient/${patientId}`,
      { auth: true }
    );

    await auditService.logAudit("hc_view", { patientId });
    return response;
  } catch (error) {
    if (error.status === 404) {
      return null; // No existe historia aún
    }
    throw error;
  }
}

/**
 * Guardar historia clínica
 * POST /api/histories
 * El backend decide: create o update
 */
export async function saveClinicalHistory(patientId, payload) {
  try {
    const response = await api.post(
      `/histories/patient/${patientId}`,
      payload,
      { auth: true }
    );

    await auditService.logAudit("hc_save", { patientId });
    return response;

  } catch (error) {
    throw error;
  }
}

export default {
  getClinicalHistory,
  saveClinicalHistory
};