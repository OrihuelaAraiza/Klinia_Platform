import { api } from "./apiClient";
import auditService from "./auditService";
import storage from "./storage"; // Tu archivo que exporta removeItem y setObject

const STORAGE_KEY_PREFIX = "clinical_history_";

/**
 * Guarda el historial clínico en la base de datos (Neon).
 * Si tiene éxito, limpia el almacenamiento local.
 */
export async function saveClinicalHistory(patientId, rawPayload, isDraft = false) {
  const timestamp = new Date().toISOString();

  // 1. Clasificación de campos para el Backend
  const idFields = ['genderIdentity', 'nationality', 'state', 'municipality', 'civilStatus', 'education', 'occupation', 'religion'];
  const identification = {};
  const clinical = {};

  Object.keys(rawPayload).forEach(key => {
    if (idFields.includes(key)) {
      identification[key] = rawPayload[key] ?? "";
    } else {
      clinical[key] = rawPayload[key];
    }
  });

  const finalPayload = {
    identification,
    clinical: {
      ...clinical,
      motive: rawPayload.motive || rawPayload.motivo_consulta || "Consulta registrada",
      status: isDraft ? "draft" : "finalized",
    }
  };

  try {
    const response = await api.post(`/patients/${patientId}/history`, finalPayload, { auth: true });
    
    storage.removeItem(`${STORAGE_KEY_PREFIX}${patientId}`);
    
    await auditService.logAudit("hc_save", { patientId, isDraft });
    return response;

  } catch (error) {
    if (error.status >= 500 || error.code === "NETWORK_ERROR") {
      const merged = { 
        ...rawPayload, 
        id: `local_${Date.now()}`, 
        isDraft, 
        updatedAt: timestamp 
      };
      storage.setObject(`${STORAGE_KEY_PREFIX}${patientId}`, merged);
      return merged;
    }
    throw error;
  }
}

/**
 * Recupera el historial.
 */
export async function getClinicalHistory(patientId) {
  try {
    const response = await api.get(`/patients/${patientId}/history`, { auth: true });
    
    const rawData = Array.isArray(response) ? response[0] : response;
    
    if (!rawData) return null;

    const flattened = {
      ...rawData.identification, 
      ...rawData,               
      ...rawData.clinical        
    };

    delete flattened.identification;
    delete flattened.clinical;
    delete flattened.professional;

    return flattened;
  } catch (error) {
    const stored = storage.getObject(`${STORAGE_KEY_PREFIX}${patientId}`);
    return stored || null;
  }
}

export default {
  saveClinicalHistory,
  getClinicalHistory,
};