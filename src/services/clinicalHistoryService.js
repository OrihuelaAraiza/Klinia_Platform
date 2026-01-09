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
    // 1. Construcción manual de la URL con Query Params
    // Esto garantiza que el Backend reciba el professionalId incluso si el apiClient es estricto
    const profId = options.params?.professionalId;
    const url = profId 
      ? `/histories/patient/${patientId}?professionalId=${profId}`
      : `/histories/patient/${patientId}`;

    const response = await api.get(url, { auth: true });

    if (!response) return null;

    // 2. Lógica de flatData: Aplanamos el objeto para que sea fácil de leer en la vista
    // Extraemos datos del objeto 'patient' que viene en el include de Prisma
    const flatData = {
      ...response,
      firstName: response.patient?.firstName || "",
      lastName: response.patient?.lastName || "",
      birthDate: response.patient?.birthDate || null,
      gender: response.patient?.gender || "",
      curp: response.patient?.curp || "",
      nationality: response.patient?.nationality || "",
      state: response.patient?.state || "",
    };

    // 3. Auditoría silenciosa
    auditService.logAudit("hc_view", { patientId }).catch(() => {});

    return flatData;
  } catch (error) {
    // Si el error es 404, devolvemos null para que el Front muestre el EmptyState
    if (error.status === 404) return null;
    throw error;
  }
}

/**
 * Crea o actualiza la historia clínica.
 */
export async function saveClinicalHistory(patientId, payload) {
  try {
    const cleanPayload = { ...payload };
    
    // Normalización de booleanos para compatibilidad con el esquema de Prisma
    const boolFields = ['hasAllergies', 'transfusions', 'psychUrgencies', 'suicideRiskScreening'];
    boolFields.forEach(field => {
      const val = cleanPayload[field];
      if (val === "SI" || val === "SÍ" || val === true) {
        cleanPayload[field] = true;
      } else if (val === "NO" || val === false) {
        cleanPayload[field] = false;
      } else {
        cleanPayload[field] = false; // Default seguro
      }
    });

    const response = await api.post(`/histories/patient/${patientId}`, cleanPayload, { auth: true });
    await auditService.logAudit("hc_save", { patientId });
    return response;
  } catch (error) {
    throw error;
  }
}

export default {
  getClinicalHistory,
  saveClinicalHistory,
};