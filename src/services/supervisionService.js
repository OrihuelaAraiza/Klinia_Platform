import { db, persist, uid, delay, nowIso } from "./mocks/db";
import { getUser } from "./storage";

function currentProfId() {
  const u = getUser();
  return u?.role === "PROFESSIONAL" ? u.id : null;
}

export async function listSupervisionLogs() {
  await delay();
  const store = db();
  const profId = currentProfId();
  return store.supervision
    .filter((s) => !profId || s.professionalId === profId)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function getSupervisionLog(id) {
  await delay();
  const store = db();
  const log = store.supervision.find((s) => s.id === id);
  if (!log) {
    const err = new Error("Bitácora no encontrada.");
    err.status = 404;
    throw err;
  }
  return log;
}

export async function createSupervisionLog(payload) {
  await delay();
  const store = db();
  const user = getUser();
  const log = {
    id: uid("sup"),
    professionalId: user?.id || "prof_demo_1",
    createdAt: nowIso(),
    ...payload,
  };
  store.supervision.unshift(log);
  persist();
  return log;
}

export async function deleteSupervisionLog(id) {
  await delay();
  const store = db();
  const idx = store.supervision.findIndex((s) => s.id === id);
  if (idx === -1) {
    const err = new Error("Bitácora no encontrada.");
    err.status = 404;
    throw err;
  }
  store.supervision.splice(idx, 1);
  persist();
  return { ok: true };
}

export default {
  listSupervisionLogs,
  getSupervisionLog,
  createSupervisionLog,
  deleteSupervisionLog,
};
