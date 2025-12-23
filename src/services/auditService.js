import { api } from "./apiClient";

const AUDIT_ENDPOINT = "/audit";

export async function logAudit(event, meta = {}, options = {}) {
  if (!event) return;
  const { auth = true } = options;

  try {
    await api.post(
      AUDIT_ENDPOINT,
      {
        event,
        meta,
        at: new Date().toISOString(),
      },
      { auth }
    );
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[audit-failed]", error.message);
    }
  }
}

export async function getProfessionalLogs() {
  try {
    return await api.get(`${AUDIT_ENDPOINT}/professional`);
  } catch (error) {
    console.error("[audit-fetch-failed]", error.message);
    throw error;
  }
}

export default {
  logAudit,
  getProfessionalLogs, 
};