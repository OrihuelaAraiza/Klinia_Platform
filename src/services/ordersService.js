import { api } from "./apiClient";

export async function create(payload) {
  if (payload?.patientId) {
    return api.post(`/patients/${payload.patientId}/orders`, payload);
  }
  return api.post("/orders", payload);
}

export async function listByPatient(patientId) {
  if (!patientId) return [];
  return api.get(`/patients/${patientId}/orders`);
}

export async function getOne(id) {
  return api.get(`/orders/${id}`);
}

export async function update(orderId, patch) {
  return api.put(`/orders/${orderId}`, patch);
}

export async function cancel(orderId) {
  return api.post(`/orders/${orderId}/cancel`, {});
}

export default { create, listByPatient, getOne, update, cancel };
