import { api } from "./apiClient";

export function listConsents(patientId) {
  return api.get(`/patients/${patientId}/consents`);
}

export function signConsent(patientId, type, extra = {}) {
  return api.post(`/patients/${patientId}/consents`, {
    type,
    status: "signed",
    ...extra,
  });
}

export function revokeConsent(patientId, consentId, extra = {}) {
  return api.put(`/patients/${patientId}/consents/${consentId}`, {
    status: "revoked",
    ...extra,
  });
}

export default {
  listConsents,
  signConsent,
  revokeConsent,
};
