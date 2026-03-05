import { api } from "./apiClient";


export async function listPatients(
  { q = "", page = 1, size = 50, professionalId = "", signal, ...extraParams } = {},
  options = {}
) {
  const params = { q, page, size, ...extraParams };
  if (professionalId) {
    params.professionalId = professionalId;
  }
  return api.get("/patients", { params, auth: true, signal, ...options });
}


export function getPatient(id, options = {}) {
  return api.get(`/patients/${id}`, { auth: true, ...options });
}


export function createPatient(payload, options = {}) {
  return api.post("/patients", payload, { auth: true, ...options });
}


export function updatePatient(id, payload, options = {}) {
  return api.put(`/patients/${id}`, payload, { auth: true, ...options });
}


export async function importAndReassign(payload) {
  return api.post("/patients/import-reassign", payload, { auth: true });
}


export const uploadAttachment = (id, formData) => {
  return api.post(`/patients/${id}/attachments`, formData, { auth: true });
};

export const getAttachmentUrl = (patientId, blobName) => {
  const encodedBlob = encodeURIComponent(blobName);
  return api.get(`/patients/${patientId}/attachments/${encodedBlob}/url`, { auth: true });
}

export const deleteAttachment = (patientId, attachmentId) => {
  return api.del(`/patients/${patientId}/attachments/${attachmentId}`, { auth: true });
}

export const getProfessionalsList = () => {
  return api.get("/profiles/list-professionals", { auth: true });
};

export const createDischargeNote = async (data) => {
  const { patientId, ...payload } = data;

  return api.post(`/patients/${patientId}/discharge`, payload, { auth: true });
};


export async function getMyProfile() {
  return api.get("/patient/profile", { auth: true });
}


export async function updateMyProfile(payload) {
  return api.put("/patient/profile", payload, { auth: true });
}


export async function requestPhoneVerification() {
  return api.post("/patient/verify-phone/request", {}, { auth: true });
}

export async function getMyDocuments(patientId) {
  const response = await api.get(`/patients/${patientId}/attachments`, { auth: true });
  return Array.isArray(response) ? response : (response?.items || []);
}

export async function listMyTherapists() {
  return api.get("/patient/my-therapists", { auth: true });
}

export const reingressPatient = async (id, reason) => {
  return api.post(`/patients/${id}/re-entry`, { reason }, { auth: true }); 
}

export const globalSearch = async (query) => {
  return api.get(`/patients/global/search?q=${query}`, { auth: true });
};

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
  getMyProfile,
  updateMyProfile,
  requestPhoneVerification,
  getMyDocuments,
  listMyTherapists,
  createDischargeNote,
  reingressPatient,
  globalSearch
};
