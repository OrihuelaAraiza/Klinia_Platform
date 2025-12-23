import { api } from "./apiClient";
import auditService from "./auditService";
import storage from "./storage";

const STORAGE_KEY_PREFIX = "clinical_history_";

/**
 * Get clinical history for a patient
 * Uses API if available, falls back to local storage
 */
export async function getClinicalHistory(patientId) {
  try {
    const response = await api.get(`/patients/${patientId}/clinical-history`, { auth: true });
    await auditService.logAudit("hc_view", { patientId });
    return response;
  } catch (error) {
    // Fallback to local storage if API fails (404 or network error)
    if (error.status === 404 || error.code === "NETWORK_ERROR") {
      const stored = storage.get(`${STORAGE_KEY_PREFIX}${patientId}`);
      if (stored) {
        await auditService.logAudit("hc_view", { patientId, source: "local_storage" });
        return stored;
      }
      return null;
    }
    throw error;
  }
}

/**
 * Save clinical history (draft or final)
 * Uses API if available, falls back to local storage
 */
export async function saveClinicalHistory(patientId, payload, isDraft = false) {
  const timestamp = new Date().toISOString();
  const historyData = {
    ...payload,
    patientId,
    updatedAt: timestamp,
    isDraft,
  };

  try {
    const response = await api.post(`/patients/${patientId}/clinical-history`, historyData, { auth: true });
    await auditService.logAudit("hc_save", { patientId, isDraft });
    return response;
  } catch (error) {
    // Fallback to local storage if API fails
    if (error.status >= 500 || error.code === "NETWORK_ERROR") {
      const existing = storage.get(`${STORAGE_KEY_PREFIX}${patientId}`) || {};
      const merged = {
        ...existing,
        ...historyData,
        id: existing.id || `hc_${Date.now()}`,
        createdAt: existing.createdAt || timestamp,
      };
      storage.set(`${STORAGE_KEY_PREFIX}${patientId}`, merged);
      await auditService.logAudit("hc_save", { patientId, isDraft, source: "local_storage" });
      return merged;
    }
    throw error;
  }
}

/**
 * Update clinical history
 */
export async function updateClinicalHistory(patientId, historyId, payload) {
  try {
    const response = await api.put(`/patients/${patientId}/clinical-history/${historyId}`, payload, { auth: true });
    await auditService.logAudit("hc_update", { patientId, historyId });
    return response;
  } catch (error) {
    // Fallback to local storage
    if (error.status >= 500 || error.code === "NETWORK_ERROR") {
      const existing = storage.get(`${STORAGE_KEY_PREFIX}${patientId}`);
      if (existing && existing.id === historyId) {
        const updated = {
          ...existing,
          ...payload,
          updatedAt: new Date().toISOString(),
        };
        storage.set(`${STORAGE_KEY_PREFIX}${patientId}`, updated);
        await auditService.logAudit("hc_update", { patientId, historyId, source: "local_storage" });
        return updated;
      }
      throw new Error("Historia clínica no encontrada");
    }
    throw error;
  }
}

export default {
  getClinicalHistory,
  saveClinicalHistory,
  updateClinicalHistory,
};


