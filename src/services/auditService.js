import { api } from "./apiClient";

const AUDIT_ENDPOINT = "/audit";

export async function logAudit(event, meta = {}) {
  if (!event) {
    return;
  }

  try {
    await api.post(
      AUDIT_ENDPOINT,
      {
        event,
        meta,
        at: new Date().toISOString(),
      },
      { auth: true }
    );
  } catch (error) {
    console.warn("[audit-failed]", error.message);
  }
}

export default {
  logAudit,
};
