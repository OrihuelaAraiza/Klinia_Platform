import { api } from "./apiClient";

/**
 * Pide un folio "preview" — útil para embeber el folio dentro del PDF
 * antes de subirlo. El folio real se asigna al guardar (POST /documents).
 *
 * @param {"NOTE"|"REPORT"|"PRESCRIPTION"|"ORDER"|"HISTORY"|"OTHER"} type
 * @returns {Promise<string|null>}
 */
export async function previewFolio(type) {
  try {
    const res = await api.get(`/documents/preview-folio?type=${encodeURIComponent(type)}`);
    return res?.folio || null;
  } catch {
    return null;
  }
}

/**
 * Registra un PDF generado: sube el blob a Azure y crea el registro persistente
 * en GeneratedDocument. Devuelve { id, folio, blobName, url, generatedAt }.
 *
 * @param {Object} params
 * @param {Blob} params.blob - Documento PDF como Blob
 * @param {string} params.type - DocumentType (NOTE | REPORT | ...)
 * @param {string} params.patientId
 * @param {string} [params.sourceId] - id de la entidad origen (Note.id, etc.)
 * @param {string} [params.title]
 * @param {string} [params.sha256]
 */
export async function registerDocument({ blob, type, patientId, sourceId, title, sha256 }) {
  if (!blob || !type || !patientId) {
    throw new Error("blob, type y patientId requeridos.");
  }
  const form = new FormData();
  form.append("file", blob, `${type.toLowerCase()}-${Date.now()}.pdf`);
  form.append("type", type);
  form.append("patientId", patientId);
  if (sourceId) form.append("sourceId", sourceId);
  if (title) form.append("title", title);
  if (sha256) form.append("sha256", sha256);
  return api.post("/documents", form);
}

/**
 * Lista los documentos PDF generados para un paciente. Aparece en
 * PatientDetail (vista del profesional) y en patient/Documents (vista del paciente).
 */
export async function listPatientDocuments(patientId) {
  if (!patientId) return [];
  return api.get(`/patients/${patientId}/documents`).catch(() => []);
}

/**
 * Refresca el SAS URL de un documento previamente generado.
 */
export async function getDocumentUrl(documentId) {
  if (!documentId) return null;
  const res = await api.get(`/documents/${documentId}/url`).catch(() => null);
  return res?.url || null;
}

export default {
  previewFolio,
  registerDocument,
  listPatientDocuments,
  getDocumentUrl,
};
