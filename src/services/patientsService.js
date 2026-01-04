import { api } from "./apiClient";

export async function listPatients({ q = "", page = 1, size = 10 } = {}, options = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (page) params.set("page", page);
  if (size) params.set("size", size);

  const query = params.toString();
  return api.get(`/patients${query ? `?${query}` : ""}`, options);
}

export function getPatient(id, options = {}) {
  return api.get(`/patients/${id}`, options);
}

export function createPatient(payload, options = {}) {
  return api.post("/patients", payload, options);
}

export function updatePatient(id, payload, options = {}) {
  return api.put(`/patients/${id}`, payload, options);
}

export async function importAndReassign(payload) {
    return api.post("/patients/import-reassign", payload, { auth: true });
}

export const uploadAttachment = (id, formData) => {
  return api.post(`/patients/${id}/attachments`, formData); 
};
export const getAttachmentUrl = (patientId, blobName) => {
  // Encodificamos para que los "/" del blobName no rompan la URL de la API
  const encodedBlob = encodeURIComponent(blobName);
  return api.get(`/patients/${patientId}/attachments/${encodedBlob}/url`);
}
export const deleteAttachment = (patientId, attachmentId) => {
  return api.delete(`/patients/${patientId}/attachments/${attachmentId}`);
}
export const getProfessionalsList = () => {
    return api.get("/profiles/list-professionals"); // Ajusta la ruta según tu servidor
};

export default {
  listPatients,
  getPatient,
  createPatient,
  updatePatient,
  uploadAttachment,
  getAttachmentUrl,
  deleteAttachment, 
  getProfessionalsList
};
