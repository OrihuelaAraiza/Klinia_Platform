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

/**
 * Uso para el panel del médico: lista por PatientId real
 */
export async function listByPatient(patientId) {
  const normalizedPatientId = ensurePatientId(patientId);
  // Cambiamos a la ruta que el backend procesa con traducción de ID si es necesario
  const response = await api.get(`/prescriptions/patient/${normalizedPatientId}`, { auth: true });
  await auditService.logAudit("prescription_list_patient", { patientId: normalizedPatientId });
  return Array.isArray(response) ? response : [];
}

/**
 * Obtiene las prescripciones del paciente autenticado.
 * CORRECCIÓN: Apunta a la ruta de 'mis prescripciones' que usa el token.
 */
export async function listMyPrescriptions() {
  // Ajustado para coincidir con el endpoint de "my-prescriptions" del backend
  const response = await api.get(`/prescriptions/my-prescriptions`, { auth: true });
  await auditService.logAudit("prescription_list_my", {});
  return Array.isArray(response) ? response : [];
}

export function getOne(id) {
  const normalizedId = ensureId(id);
  return api.get(`/prescriptions/detail/${normalizedId}`, { auth: true });
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
  listMyPrescriptions,
  getOne,
  suspend,
};