import { api } from "./apiClient";

const COMPLETE_ENDPOINT = "/auth/register/complete";

export async function complete(payload, options = {}) {
  if (!payload) {
    throw new Error("Payload de registro inválido.");
  }

  return api.post(COMPLETE_ENDPOINT, payload, {
    auth: false,
    ...options,
  });
}

export default {
  complete,
};
