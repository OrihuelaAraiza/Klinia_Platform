import { api } from "./apiClient";

function normalizeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function ensureArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === null || value === undefined) {
    return [];
  }
  return Array.isArray(value.items) ? value.items : [];
}

export async function getStats(options = {}) {
  try {
    const response = await api.get("/dashboard/stats", { ...options, skipAuthError: true });
    return {
      patientsActive: normalizeNumber(response?.patientsActive),
      sessionsToday: normalizeNumber(response?.sessionsToday),
      sessionsCancelledToday: normalizeNumber(response?.sessionsCancelledToday),
      prescriptionsActive: normalizeNumber(response?.prescriptionsActive),
      lastPrescriptionTime: response?.lastPrescriptionTime || null,
      reportsGenerated: normalizeNumber(response?.reportsGenerated),
      reportsProgress: normalizeNumber(response?.reportsProgress),
    };
  } catch (error) {
    // If stats fail, return defaults instead of breaking the app
    if (import.meta.env.DEV) {
      console.warn("[Dashboard] Stats failed, using defaults:", error.message);
    }
    return {
      patientsActive: 0,
      sessionsToday: 0,
      sessionsCancelledToday: 0,
      prescriptionsActive: 0,
      lastPrescriptionTime: null,
      reportsGenerated: 0,
      reportsProgress: 0,
    };
  }
}

export async function getTodaySessions(options = {}) {
  try {
    const response = await api.get("/dashboard/sessions/today", { ...options, skipAuthError: true });
    return ensureArray(response).map((item) => ({
      id: item?.id ?? item?.sessionId ?? null,
      time: item?.time || item?.scheduledAt || null,
      patientName: item?.patientName || item?.patient || "Paciente",
      status: item?.status || null,
    }));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[Dashboard] Today sessions failed:", error.message);
    }
    return [];
  }
}

export async function getRecentNotes(options = {}) {
  try {
    const response = await api.get("/dashboard/notes/recent", { ...options, skipAuthError: true });
    return ensureArray(response).map((item) => ({
      id: item?.id ?? item?.noteId ?? null,
      patientId: item?.patientId ?? null,
      patientName: item?.patientName || "Paciente",
      closedAt: item?.closedAt || item?.updatedAt || null,
    }));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[Dashboard] Recent notes failed:", error.message);
    }
    return [];
  }
}

export async function getRecentPrescriptions(options = {}) {
  try {
    const response = await api.get("/dashboard/prescriptions/recent", { ...options, skipAuthError: true });
    return ensureArray(response).map((item) => ({
      id: item?.id ?? item?.prescriptionId ?? null,
      patientId: item?.patientId ?? null,
      patientName: item?.patientName || "Paciente",
      folio: item?.folio || item?.serial || null,
      signedAt: item?.signedAt || item?.issuedAt || null,
    }));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[Dashboard] Recent prescriptions failed:", error.message);
    }
    return [];
  }
}

export async function getIncompleteHistories(options = {}) {
  try {
    const response = await api.get("/dashboard/histories/incomplete", { ...options, skipAuthError: true });
    return ensureArray(response).map((item) => ({
      id: item?.id ?? item?.patientId ?? null,
      patientId: item?.patientId ?? null,
      patientName: item?.patientName || "Paciente",
      completionPercentage: item?.completionPercentage ?? 0,
      missingFieldsCount: item?.missingFieldsCount ?? 0,
      lastUpdated: item?.lastUpdated || item?.updatedAt || null,
    }));
  } catch (error) {
    // If endpoint doesn't exist, fallback to client-side validation
    if (error.status === 404) {
      return getIncompleteHistoriesFallback(options);
    }
    // For any other error (including 401), return empty array instead of throwing
    if (import.meta.env.DEV) {
      console.warn("[Dashboard] Incomplete histories failed:", error.message);
    }
    return [];
  }
}

/**
 * Fallback: Get incomplete histories by checking all patients
 * This is used when the backend endpoint doesn't exist yet
 */
async function getIncompleteHistoriesFallback(options = {}) {
  try {
    const { listPatients } = await import("./patientsService");
    const { getClinicalHistory } = await import("./clinicalHistoryService");
    const { isClinicalHistoryIncomplete, validateClinicalHistory } = await import("../utils/clinicalHistoryValidator");
    
    // Get all patients (or a reasonable subset)
    const patientsResponse = await listPatients({ page: 1, size: 100 }, options);
    const patients = ensureArray(patientsResponse.items || patientsResponse);
    
    const incomplete = [];
    
    // Check each patient's history
    for (const patient of patients.slice(0, 20)) { // Limit to 20 for performance
      try {
        const history = await getClinicalHistory(patient.id);
        
        if (!history || isClinicalHistoryIncomplete(history)) {
          const validation = validateClinicalHistory(history || {});
          incomplete.push({
            id: patient.id,
            patientId: patient.id,
            patientName: `${patient.firstName || ""} ${patient.lastName || ""}`.trim() || "Paciente",
            completionPercentage: validation.completionPercentage || 0,
            missingFieldsCount: validation.missingFields?.length || 0,
            lastUpdated: history?.updatedAt || patient.updatedAt || null,
          });
        }
      } catch (err) {
        // If no history exists, it's incomplete
        if (err.status === 404 || err.message?.includes("404")) {
          incomplete.push({
            id: patient.id,
            patientId: patient.id,
            patientName: `${patient.firstName || ""} ${patient.lastName || ""}`.trim() || "Paciente",
            completionPercentage: 0,
            missingFieldsCount: 999,
            lastUpdated: patient.updatedAt || null,
          });
        }
      }
    }
    
    return incomplete;
  } catch (error) {
    console.warn("[Dashboard] Error fetching incomplete histories:", error);
    return [];
  }
}

export default {
  getStats,
  getTodaySessions,
  getRecentNotes,
  getRecentPrescriptions,
  getIncompleteHistories,
};
