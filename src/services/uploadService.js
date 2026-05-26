import { api } from "./apiClient";

/**
 * Sube un archivo al endpoint /uploads/profile-asset (Azure Blob).
 * Backend devuelve { blobName, previewUrl } con SAS de 30 min.
 */
export async function uploadDocument(file, metadata = {}) {
  if (!file || typeof Blob === "undefined" || !(file instanceof Blob)) {
    throw new Error("Archivo inválido para subir.");
  }
  const form = new FormData();
  form.append("file", file);
  Object.entries(metadata || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) form.append(k, String(v));
  });
  const response = await api.post("/uploads/profile-asset", form);
  return {
    ...response,
    url: response?.previewUrl || response?.url || "#",
    fileName: file?.name,
    size: file?.size || 0,
    mimeType: file?.type || "application/octet-stream",
    metadata,
  };
}

export default { uploadDocument };
