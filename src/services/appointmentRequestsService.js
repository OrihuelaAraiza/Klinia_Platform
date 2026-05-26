import { api } from "./apiClient";

export const APPOINTMENT_REQUEST_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  DECLINED: "DECLINED",
  CANCELLED: "CANCELLED",
};

export async function create(payload) {
  return api.post("/appointment-requests", payload);
}

export async function listForPatient() {
  return api.get("/appointment-requests/mine");
}

export async function listForProfessional({ status } = {}) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return api.get(`/appointment-requests${qs}`);
}

export async function countPendingForProfessional() {
  const res = await api.get("/appointment-requests/pending-count").catch(() => ({ count: 0 }));
  return res?.count || 0;
}

export async function cancel(id) {
  return api.post(`/appointment-requests/${id}/cancel`, {});
}

export async function accept(id, { scheduledAt, modality, message } = {}) {
  return api.post(`/appointment-requests/${id}/accept`, { scheduledAt, modality, message });
}

export async function decline(id, message = "") {
  return api.post(`/appointment-requests/${id}/decline`, { message });
}

export default {
  create,
  listForPatient,
  listForProfessional,
  countPendingForProfessional,
  cancel,
  accept,
  decline,
  APPOINTMENT_REQUEST_STATUS,
};
