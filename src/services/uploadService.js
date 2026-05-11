import { delay, uid, nowIso } from "./mocks/db";

export async function uploadDocument(file, metadata = {}) {
  if (typeof Blob === "undefined") {
    throw new Error("Subidas de archivos no soportadas en este entorno.");
  }
  if (!(file instanceof Blob)) {
    throw new Error("Archivo inválido para subir.");
  }
  await delay(200);
  const fileName = file?.name || `archivo-${Date.now()}`;
  return {
    id: uid("upl"),
    url: typeof URL !== "undefined" ? URL.createObjectURL(file) : "#mock",
    blobName: `mock/uploads/${fileName}`,
    fileName,
    size: file?.size || 0,
    mimeType: file?.type || "application/octet-stream",
    uploadedAt: nowIso(),
    metadata,
  };
}

export default {
  uploadDocument,
};
