import { api } from "./apiClient";
import auditService from "./auditService"; // Ajusta el path según tu proyecto

// Cambiamos el nombre para que sea claro que validamos el registro del paciente
function ensurePatientRecordId(id) {
  const normalized = String(id || "").trim();
  if (!normalized || normalized === "undefined") {
    throw new Error("Selecciona un paciente válido antes de continuar.");
  }
  return normalized;
}

function ensureId(id) {
  const normalized = String(id || "").trim();
  if (!normalized) {
    throw new Error("Identificador de registro clínico inválido.");
  }
  return normalized;
}

function buildAuditMeta(record = {}) {
  return {
    patientRecordId: record.patientRecordId,
    prescriptionId: record.id,
    folio: record.folio,
  };
}

export async function create(payload) {
  // 1. Validamos que venga el ID bajo la llave correcta: patientRecordId
  const normalizedId = ensurePatientRecordId(payload?.patientRecordId);
  
  // 2. Enviamos el payload tal cual (ya procesado con px_data y escalas en el form)
  const response = await api.post(
    "/prescriptions",
    payload, 
    { auth: true }
  );

  await auditService.logAudit("prescription_create", buildAuditMeta(response));
  return response;
}

export async function listByPatient(patientRecordId) {
  const normalizedId = ensurePatientRecordId(patientRecordId);
  // Nota: Asegúrate de que tu backend tenga esta ruta o usa query params
  const response = await api.get(`/prescriptions?id=${normalizedId}`, { auth: true });
  await auditService.logAudit("prescription_list_patient", { patientRecordId: normalizedId });
  return Array.isArray(response) ? response : [];
}

export async function listMyPrescriptions() {
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
  // Ajustado a la ruta de tu controlador: /detail/:id/suspend
  const response = await api.post(`/prescriptions/detail/${normalizedId}/suspend`, {}, { auth: true });
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