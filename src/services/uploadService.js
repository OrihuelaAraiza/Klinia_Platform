import { api } from "./apiClient";

const UPLOAD_ENDPOINT = "/uploads";

export async function uploadDocument(file, metadata = {}, options = {}) {
  if (typeof Blob === "undefined") {
    throw new Error("Subidas de archivos no soportadas en este entorno.");
  }

  if (!(file instanceof Blob)) {
    throw new Error("Archivo inválido para subir.");
  }

  const formData = new FormData();
  formData.append("file", file);

  Object.entries(metadata).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });

  return api.request(UPLOAD_ENDPOINT, {
    method: "POST",
    body: formData,
    auth: true, // El endpoint requiere autenticación para asociar el archivo al usuario
    ...options,
  });
}

export default {
  uploadDocument,
};
