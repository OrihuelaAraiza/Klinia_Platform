import { api } from "./apiClient";

export async function getStats() {
  return api.get("/dashboard/stats").catch(() => ({}));
}

export async function getTodaySessions() {
  return api.get("/dashboard/sessions/today").catch(() => []);
}

export async function getRecentNotes() {
  return api.get("/dashboard/notes/recent").catch(() => []);
}

export async function getRecentPrescriptions() {
  return api.get("/dashboard/prescriptions/recent").catch(() => []);
}

export async function getIncompleteHistories() {
  return api.get("/dashboard/histories/incomplete").catch(() => []);
}

export default {
  getStats,
  getTodaySessions,
  getRecentNotes,
  getRecentPrescriptions,
  getIncompleteHistories,
};
