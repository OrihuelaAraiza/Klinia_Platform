import { db, persist, uid, delay, paginate, nowIso } from "./mocks/db";
import { getUser } from "./storage";

function isSameDay(a, b) {
  const x = new Date(a);
  const y = new Date(b);
  return (
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate()
  );
}

function patientName(store, patientId) {
  const p = store.patients.find((x) => x.id === patientId);
  return p ? `${p.firstName} ${p.lastName}` : "Paciente";
}

export async function listSessions({
  q = "",
  from,
  to,
  status,
  professionalId,
  page = 1,
  size = 10,
} = {}) {
  await delay();
  const store = db();
  let items = [...store.sessions];
  if (professionalId) items = items.filter((s) => s.professionalId === professionalId);
  if (status) items = items.filter((s) => s.status === status);
  if (from) items = items.filter((s) => new Date(s.scheduledAt) >= new Date(from));
  if (to) items = items.filter((s) => new Date(s.scheduledAt) <= new Date(to));
  if (q?.trim()) {
    const needle = q.toLowerCase();
    items = items.filter((s) => (s.patientName || "").toLowerCase().includes(needle));
  }
  items.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  return paginate(items, { page, size });
}

export async function listSessionsByPatient(patientId, { page = 1, size = 10 } = {}) {
  await delay();
  const store = db();
  const items = store.sessions
    .filter((s) => s.patientId === patientId)
    .sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt))
    .map((s) => ({
      ...s,
      professionalName:
        store.users.find((u) => u.id === s.professionalId)?.name || "Especialista",
    }));
  return paginate(items, { page, size });
}

export const listByPatient = listSessionsByPatient;

export async function createSession(payload) {
  await delay();
  const store = db();
  const user = getUser();
  const session = {
    id: uid("ses"),
    patientId: payload?.patientId,
    patientName: payload?.patientName || patientName(store, payload?.patientId),
    professionalId: payload?.professionalId || user?.id || "prof_demo_1",
    scheduledAt: payload?.scheduledAt || payload?.time || nowIso(),
    time: payload?.scheduledAt || payload?.time || nowIso(),
    duration: payload?.duration || 60,
    modality: payload?.modality || "PRESENCIAL",
    status: payload?.status || "SCHEDULED",
    notes: payload?.notes || "",
    noteId: null,
    createdAt: nowIso(),
    ...payload,
  };
  store.sessions.push(session);
  persist();
  return session;
}

export async function updateSession(id, payload) {
  await delay();
  const store = db();
  const idx = store.sessions.findIndex((s) => s.id === id);
  if (idx === -1) {
    const err = new Error("Sesión no encontrada.");
    err.status = 404;
    throw err;
  }
  store.sessions[idx] = { ...store.sessions[idx], ...payload, id };
  persist();
  return store.sessions[idx];
}

export async function changeStatus(id, payload) {
  return updateSession(id, { status: payload?.status || payload });
}

export async function linkNote(id, noteId) {
  return updateSession(id, { noteId });
}

export async function getTodayCounts() {
  await delay();
  const store = db();
  const today = new Date();
  const todays = store.sessions.filter((s) => isSameDay(s.scheduledAt, today));
  return {
    total: todays.length,
    scheduled: todays.filter((s) => s.status === "SCHEDULED").length,
    completed: todays.filter((s) => s.status === "COMPLETED").length,
    cancelled: todays.filter((s) => s.status === "CANCELLED").length,
  };
}

export async function exportIcs(id) {
  const store = db();
  const session = store.sessions.find((s) => s.id === id);
  if (!session) return;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `UID:${session.id}@romimente.mock`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "")}`,
    `DTSTART:${new Date(session.scheduledAt).toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "")}`,
    `SUMMARY:Sesión con ${session.patientName}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sesion-${id}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export async function getOne(id) {
  await delay();
  const store = db();
  const session = store.sessions.find((s) => s.id === id);
  if (!session) {
    const err = new Error("Sesión no encontrada.");
    err.status = 404;
    throw err;
  }
  return session;
}

export default {
  listSessions,
  listSessionsByPatient,
  listByPatient,
  createSession,
  updateSession,
  changeStatus,
  linkNote,
  getTodayCounts,
  exportIcs,
  getOne,
};
