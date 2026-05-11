import { registerComplete } from "./authService";

export async function complete(payload) {
  if (!payload) {
    throw new Error("Payload de registro inválido.");
  }
  return registerComplete(payload);
}

export default {
  complete,
};
