import { api } from "./apiClient";

const AUDIT_ENDPOINT = "/audit";

export async function logAudit(event, meta = {}, options = {}) {
  if (!event) return;
  const { auth = true, silent = false } = options;

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
    // Silently fail for audit errors - they're not critical and shouldn't break the app
    // Only log in DEV mode for debugging, and skip warnings for common expected errors
    if (import.meta.env.DEV && !silent) {
      const isAuthError = error.status === 401 || error.message?.includes("Sesión expirada");
      const isNotFound = error.status === 404;
      const isLoginEvent = event?.includes("login") || event?.includes("auth_");
      
      // Skip warnings for expected errors during login/auth flow or when endpoint doesn't exist
      if (!isAuthError && !isNotFound) {
        console.debug("[audit-failed]", event, error.status, error.message);
      }
    }
    // Always silently fail - audit logging should never break the application flow
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