// clinicalHistoryService.js
import { api } from "./apiClient";
import auditService from "./auditService";

export async function getClinicalHistory(patientId) {
  try {
    const response = await api.get(`/histories/patient/${patientId}`, { auth: true });

    if (!response) return null;

    // Aplanamos los datos del paciente dentro de la historia para que el formulario los vea
    const flatData = {
      ...response,
      firstName: response.patient?.firstName,
      lastName: response.patient?.lastName,
      birthDate: response.patient?.birthDate,
      gender: response.patient?.gender,
      curp: response.patient?.curp,
      nationality: response.patient?.nationality,
      state: response.patient?.state,
    };

    await auditService.logAudit("hc_view", { patientId });
    return flatData;
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

export async function saveClinicalHistory(patientId, payload) {
  try {
    // Limpieza rápida en el front antes de enviar
    const cleanPayload = { ...payload };
    
    // Aseguramos que los campos que el backend espera como Boolean se envíen correctamente
    const boolFields = ['hasAllergies', 'transfusions', 'psychUrgencies', 'suicideRiskScreening'];
    boolFields.forEach(field => {
      if (cleanPayload[field] === "SI" || cleanPayload[field] === "SÍ") cleanPayload[field] = true;
      if (cleanPayload[field] === "NO") cleanPayload[field] = false;
    });

    const response = await api.post(`/histories/patient/${patientId}`, cleanPayload, { auth: true });
    await auditService.logAudit("hc_save", { patientId });
    return response;
  } catch (error) {
    throw error;
  }
}