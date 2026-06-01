import { api } from "./apiClient";

/**
 * Sube un archivo al endpoint /uploads/profile-asset (Azure Blob).
 * Backend devuelve { blobName, previewUrl } con SAS de 30 min.
 *
 * IMPORTANTE: para persistencia, hay que guardar `blobName` en la BD, NO la
 * `previewUrl` (que expira). Usa `resolveSas(blobName)` cuando necesites
 * mostrar el archivo después.
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
    blobName: response?.blobName,
    previewUrl: response?.previewUrl,
    url: response?.previewUrl || response?.url || "#",
    fileName: file?.name,
    size: file?.size || 0,
    mimeType: file?.type || "application/octet-stream",
    metadata,
  };
}

/**
 * Devuelve una URL SAS fresca (30 min) para un blob propio.
 * Si el input ya es una URL https://, se devuelve tal cual (legado).
 */
export async function resolveSas(blobNameOrUrl) {
  if (!blobNameOrUrl) return null;
  if (typeof blobNameOrUrl !== "string") return null;
  if (blobNameOrUrl.startsWith("http")) return blobNameOrUrl;
  try {
    const resp = await api.get(`/uploads/resolve-sas?blobName=${encodeURIComponent(blobNameOrUrl)}`);
    return resp?.url || null;
  } catch {
    return null;
  }
}

export default { uploadDocument, resolveSas };
