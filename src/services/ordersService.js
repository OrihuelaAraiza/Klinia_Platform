import { api } from "./apiClient";
import auditService from "./auditService";

function ensurePatientId(patientId) {
  const normalized = String(patientId || "").trim();
  if (!normalized) {
    throw new Error("Selecciona un paciente válido antes de continuar.");
  }
  return normalized;
}

function ensureId(id) {
  const normalized = String(id || "").trim();
  if (!normalized) {
    throw new Error("Identificador de orden inválido.");
  }
  return normalized;
}

function buildAuditMeta(record = {}) {
  return {
    patientId: record.patientId,
    orderId: record.id,
    folio: record.folio,
  };
}

export async function create(payload) {
  const normalizedPatientId = ensurePatientId(payload?.patientId);
  const response = await api.post(
    "/orders",
    { ...payload, patientId: normalizedPatientId },
    { auth: true }
  );
  await auditService.logAudit("order_create", buildAuditMeta(response));
  return response;
}

export async function listByPatient(patientId) {
  const normalizedPatientId = ensurePatientId(patientId);
  const response = await api.get(`/patients/${normalizedPatientId}/orders`, { auth: true });
  await auditService.logAudit("order_list_patient", { patientId: normalizedPatientId });
  return Array.isArray(response) ? response : [];
}

export async function getOne(id) {
  const normalizedId = ensureId(id);
  const response = await api.get(`/orders/${normalizedId}`, { auth: true });
  await auditService.logAudit("order_view", buildAuditMeta(response));
  return response;
}

export async function update(orderId, patch) {
  const normalizedId = ensureId(orderId);
  const response = await api.put(`/orders/${normalizedId}`, patch, { auth: true });
  await auditService.logAudit("order_update", buildAuditMeta(response));
  return response;
}

export async function cancel(orderId) {
  const normalizedId = ensureId(orderId);
  const response = await api.post(`/orders/${normalizedId}/cancel`, {}, { auth: true });
  await auditService.logAudit("order_cancel", buildAuditMeta(response));
  return response;
}

export default {
  create,
  listByPatient,
  getOne,
  update,
  cancel,
};

