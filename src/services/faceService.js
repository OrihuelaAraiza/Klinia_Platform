import { api } from "./apiClient";

const VERIFY_ENDPOINT = "/verify/face";

export async function verifyFace(blob, options = {}) {
  if (typeof Blob === "undefined") {
    throw new Error("Captura facial no soportada.");
  }

  if (!(blob instanceof Blob)) {
    throw new Error("Imagen de rostro inválida.");
  }

  const formData = new FormData();
  const fileName =
    blob instanceof File && blob.name ? blob.name : "selfie.jpg";

  formData.append("file", blob, fileName);

  return api.request(VERIFY_ENDPOINT, {
    method: "POST",
    body: formData,
    auth: false,
    ...options,
  });
}

export default {
  verifyFace,
};
