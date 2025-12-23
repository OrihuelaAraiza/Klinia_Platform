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
    throw new Error("Identificador de prescripción inválido.");
  }
  return normalized;
}



function buildAuditMeta(record = {}) {
  return {
    patientId: record.patientId,
    prescriptionId: record.id,
    folio: record.folio,
  };
}

export async function create(payload) {
  const normalizedPatientId = ensurePatientId(payload?.patientId);
  const response = await api.post(
    "/prescriptions",
    { ...payload, patientId: normalizedPatientId },
    { auth: true }
  );
  await auditService.logAudit("prescription_create", buildAuditMeta(response));
  return response;
}

export async function listByPatient(patientId) {
  const normalizedPatientId = ensurePatientId(patientId);
  const response = await api.get(`/patients/${normalizedPatientId}/prescriptions`, { auth: true });
  await auditService.logAudit("prescription_list_patient", { patientId: normalizedPatientId });
  return Array.isArray(response) ? response : [];
}

export function getOne(id) {
  // Ajustamos la URL para que coincida con lo que espera el servidor
  return api.get(`/prescriptions/detail/${id}`);
}

export async function suspend(id) {
  const normalizedId = ensureId(id);
  const response = await api.post(`/prescriptions/${normalizedId}/suspend`, {}, { auth: true });
  await auditService.logAudit("prescription_suspend", buildAuditMeta(response));
  return response;
}



export default {
  create,
  listByPatient,
  getOne,
  suspend,
};
