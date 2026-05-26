import { api } from "./apiClient";

export async function create(payload) {
  return api.post("/linkage-requests", payload);
}

export async function listForPatient() {
  return api.get("/linkage-requests/mine");
}

export async function listForProfessional({ status } = {}) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return api.get(`/linkage-requests${qs}`);
}

export async function countPendingForProfessional() {
  const res = await api.get("/linkage-requests/pending-count").catch(() => ({ count: 0 }));
  return res?.count || 0;
}

export async function accept(requestId, message = "") {
  return api.post(`/linkage-requests/${requestId}/accept`, { message });
}

export async function decline(requestId, message = "") {
  return api.post(`/linkage-requests/${requestId}/decline`, { message });
}

export default {
  create,
  listForPatient,
  listForProfessional,
  countPendingForProfessional,
  accept,
  decline,
};
