import { api } from "./apiClient";

export async function listPatients({ q = "", page = 1, size = 50, professionalId = "" } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (page) params.set("page", String(page));
  if (size) params.set("size", String(size));
  if (professionalId) params.set("professionalId", professionalId);
  const qs = params.toString();
  return api.get(`/patients${qs ? `?${qs}` : ""}`);
}

export async function getPatient(id) {
  if (!id) return null;
  return api.get(`/patients/${id}`);
}

export async function createPatient(payload) {
  return api.post("/patients", payload);
}

export async function updatePatient(id, payload) {
  return api.put(`/patients/${id}`, payload);
}

export async function importAndReassign(payload) {
  return api.post("/patients/import-reassign", payload);
}

export async function uploadAttachment(id, formData) {
  return api.post(`/patients/${id}/attachments`, formData);
}

export async function getAttachmentUrl(patientId, blobName) {
  if (!patientId || !blobName) return null;
  return api.get(
    `/patients/${patientId}/attachments/url?blob=${encodeURIComponent(blobName)}`
  );
}

export async function deleteAttachment(patientId, attachmentId) {
  return api.delete(`/patients/${patientId}/attachments/${attachmentId}`);
}

export async function getProfessionalsList() {
  return api.get("/profiles/list-professionals", { auth: false });
}

export async function createDischargeNote(data) {
  const { patientId, ...rest } = data;
  return api.post(`/patients/${patientId}/discharge`, rest);
}


export async function getMyProfile() {
  return api.get("/patient/profile");
}

export async function updateMyProfile(payload) {
  return api.put("/patient/profile", payload);
}

export async function requestPhoneVerification() {
  return api.post("/patient/verify-phone/request", {});
}

export async function getMyDocuments(patientId) {
  if (!patientId) return [];
  const patient = await getPatient(patientId).catch(() => null);
  if (!patient) return [];
  try {
    const list = JSON.parse(patient.attachmentsJson || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function listMyTherapists() {
  return api.get("/patient/my-therapists");
}

export async function reingressPatient(id, reason) {
  return api.post(`/patients/${id}/reentry`, { reason });
}

export async function globalSearch(query) {
  if (!query?.trim()) return [];
  return api.get(`/patients/global/search?q=${encodeURIComponent(query)}`);
}

export default {
  listPatients,
  getPatient,
  createPatient,
  updatePatient,
  importAndReassign,
  uploadAttachment,
  getAttachmentUrl,
  deleteAttachment,
  getProfessionalsList,
  createDischargeNote,
  getMyProfile,
  updateMyProfile,
  requestPhoneVerification,
  getMyDocuments,
  listMyTherapists,
  reingressPatient,
  globalSearch,
};
