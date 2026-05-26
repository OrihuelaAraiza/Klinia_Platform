import { api } from "./apiClient";

export async function create(payload) {
  if (payload?.patientId) {
    return api.post(`/patients/${payload.patientId}/prescriptions`, payload);
  }
  return api.post("/prescriptions", payload);
}

export async function listByPatient(patientId) {
  if (!patientId) return [];
  return api.get(`/patients/${patientId}/prescriptions`);
}

export async function listMyPrescriptions() {
  return api.get("/prescriptions/my-prescriptions");
}

export async function getOne(id) {
  return api.get(`/prescriptions/${id}`);
}

export async function suspend(id) {
  return api.post(`/prescriptions/${id}/suspend`, {});
}

export default {
  create,
  listByPatient,
  listMyPrescriptions,
  getOne,
  suspend,
};
