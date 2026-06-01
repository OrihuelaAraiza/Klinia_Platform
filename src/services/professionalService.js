import { api } from "./apiClient";
import { setUser } from "./storage";

/**
 * Devuelve el perfil del profesional logueado con URLs SAS frescas (30 min).
 * Usar este endpoint cuando se necesite mostrar fotos/galerías persistidas.
 */
export async function getMyProfile() {
  return api.get("/professional/profile").catch(() => null);
}

export async function updateProfile(payload) {
  const updated = await api.put("/professional/profile", payload);
  // refrescar cache local
  const user = updated?.user || updated;
  if (user?.id) setUser(user);
  return user;
}

export async function listDelegates() {
  return api.get("/delegates").catch(() => []);
}

export async function createDelegate(email, password, name) {
  return api.post("/delegates", { email, password, name });
}

export async function deleteDelegate(delegateId) {
  return api.delete(`/delegates/${delegateId}`);
}

export async function listAuditLog() {
  return api.get("/audit/professional").catch(() => []);
}

export async function countDelegates() {
  try {
    const list = await listDelegates();
    return Array.isArray(list) ? list.length : 0;
  } catch {
    return 0;
  }
}

export default {
  getMyProfile,
  updateProfile,
  listDelegates,
  createDelegate,
  deleteDelegate,
  listAuditLog,
  countDelegates,
};
