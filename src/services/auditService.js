import { api } from "./apiClient";

export async function logAudit(event, meta = {}) {
  if (!event) return null;
  try {
    return await api.post("/audit", { event, meta });
  } catch {
    return null;
  }
}

export async function getProfessionalLogs() {
  return api.get("/audit/professional").catch(() => []);
}

export default {
  logAudit,
  getProfessionalLogs,
};
