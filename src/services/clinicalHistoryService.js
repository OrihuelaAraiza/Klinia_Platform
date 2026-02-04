import { api } from "./apiClient";
import auditService from "./auditService";

/**
 * Obtiene la historia clínica de un paciente.
 * Soporta tanto PatientId (Médicos) como UserId (Pacientes).
 * @param {string} patientId - ID del paciente o usuario.
 * @param {object} options - Debe incluir { params: { professionalId } }.
 */
export async function getClinicalHistory(patientId, options = {}) {
  try {
    const profId = options.params?.professionalId;
    const url = profId 
      ? `/histories/patient/${patientId}?professionalId=${profId}`
      : `/histories/patient/${patientId}`;

    const response = await api.get(url, { auth: true });

    if (!response) return null;

    // Auditoría silenciosa
    auditService.logAudit("hc_view", { patientId }).catch(() => {});

    // El backend ya debería enviar los datos listos, 
    // pero aseguramos valores por defecto para el Wizard
    return {
      ...response,
      firstName: response.patient?.firstName || "",
      lastName: response.patient?.lastName || "",
      diagnoses: Array.isArray(response.diagnoses) ? response.diagnoses : [],
    };
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

/**
 * Normaliza valores yesno a booleanos
 */
function normalizeYesNo(value) {
  if (value === "SI" || value === "SÍ" || value === true) return true;
  if (value === "NO" || value === false) return false;
  return false; // Default seguro
}

/**
 * Crea o actualiza la historia clínica.
 */
export async function saveClinicalHistory(patientId, payload) {
  try {
    if (!payload || Object.keys(payload).length === 0) {
      throw new Error("El formulario está vacío.");
    }

    const dataToSend = { ...payload };

    const blackList = ['expediente', 'nombreCompleto', 'curp', 'sexo', 'nacionalidad'];
    blackList.forEach(key => delete dataToSend[key]);

    const response = await api.post(`/histories/patient/${patientId}`, dataToSend, { auth: true });
    
    await auditService.logAudit("hc_save", { patientId });
    return response;

  } catch (error) {
    console.error('Error en saveClinicalHistory:', error);
    throw error;
  }
}
export async function getPatientHistory(patientId, professionalId) {
  return api.get(`/histories/patient/${patientId}?professionalId=${professionalId}`, { 
    auth: true 
  });
}

export default {
  getClinicalHistory,
  saveClinicalHistory,
  getPatientHistory
};