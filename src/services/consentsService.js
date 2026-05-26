import { api } from "./apiClient";

export async function listConsents(patientId) {
  if (!patientId) return [];
  return api.get(`/patients/${patientId}/consents`).catch(() => []);
}

export async function signConsent(patientId, type, extra = {}) {
  return api.post(`/patients/${patientId}/consents`, { type, ...extra });
}

export async function revokeConsent(patientId, consentId, extra = {}) {
  return api.post(`/patients/${patientId}/consents/${consentId}/revoke`, extra);
}

export default { listConsents, signConsent, revokeConsent };
