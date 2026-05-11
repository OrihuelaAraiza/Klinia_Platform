import { db, persist, delay, nowIso } from "./mocks/db";
import { getUser } from "./storage";

export async function getHistory(patientId) {
  await delay();
  const store = db();
  return store.histories[patientId] || null;
}

export async function createHistory(patientId, payload) {
  await delay();
  const store = db();
  const user = getUser();
  const existing = store.histories[patientId] || {};
  store.histories[patientId] = {
    ...existing,
    ...payload,
    patientId,
    professionalId: user?.id || existing.professionalId || "prof_demo_1",
    updatedAt: nowIso(),
    createdAt: existing.createdAt || nowIso(),
  };
  persist();
  return store.histories[patientId];
}

export async function getHistoryForProfessional(patientId) {
  return getHistory(patientId);
}

export default {
  getHistory,
  createHistory,
  getHistoryForProfessional,
};
