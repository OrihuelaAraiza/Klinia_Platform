import { api } from "./apiClient";

/**
 * Directorio público de terapeutas (consume /api/directory de klinia-api).
 * No requiere autenticación.
 */

export async function listPublicTherapists({ specialty, q } = {}) {
  const params = new URLSearchParams();
  if (specialty) params.set("specialty", specialty);
  if (q?.trim()) params.set("q", q.trim());
  const qs = params.toString();
  return api.get(`/directory/therapists${qs ? `?${qs}` : ""}`, { auth: false });
}

export async function getPublicTherapist(id) {
  if (!id) return null;
  try {
    return await api.get(`/directory/therapists/${id}`, { auth: false });
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

export default {
  listPublicTherapists,
  getPublicTherapist,
};
