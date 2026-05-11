import { delay } from "./mocks/db";

export async function verifyFace(blob) {
  if (typeof Blob === "undefined") {
    throw new Error("Captura facial no soportada.");
  }
  if (!(blob instanceof Blob)) {
    throw new Error("Imagen de rostro inválida.");
  }
  await delay(400);
  return {
    verified: true,
    confidence: 0.96,
    match: true,
  };
}

export default {
  verifyFace,
};
