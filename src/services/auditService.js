import { db, persist, uid } from "./mocks/db";
import { getUser } from "./storage";

export async function logAudit(event, meta = {}) {
  if (!event) return;
  try {
    const store = db();
    const user = getUser();
    store.auditLog.push({
      id: uid("aud"),
      event,
      meta,
      userId: user?.id || null,
      at: new Date().toISOString(),
    });
    if (store.auditLog.length > 500) {
      store.auditLog.splice(0, store.auditLog.length - 500);
    }
    persist();
  } catch {
    /* silent */
  }
}

export async function getProfessionalLogs() {
  const store = db();
  const user = getUser();
  return store.auditLog
    .filter((a) => !user || a.userId === user.id)
    .sort((a, b) => (b.at || "").localeCompare(a.at || ""));
}

export default {
  logAudit,
  getProfessionalLogs,
};
