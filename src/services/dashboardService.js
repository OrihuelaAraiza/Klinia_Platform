import { db, delay } from "./mocks/db";
import { getUser } from "./storage";

function isToday(date) {
  const d = new Date(date);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

function patientName(store, patientId) {
  const p = store.patients.find((x) => x.id === patientId);
  return p ? `${p.firstName} ${p.lastName}` : "Paciente";
}

function currentProfId() {
  const u = getUser();
  return u?.role === "PROFESSIONAL" ? u.id : null;
}

export async function getStats() {
  await delay();
  const store = db();
  const profId = currentProfId();
  const patients = profId
    ? store.patients.filter((p) => p.professionalId === profId)
    : store.patients;
  const sessions = profId
    ? store.sessions.filter((s) => s.professionalId === profId)
    : store.sessions;
  const sessionsToday = sessions.filter((s) => isToday(s.scheduledAt));
  const cancelledToday = sessionsToday.filter((s) => s.status === "CANCELLED");
  const rxActive = store.prescriptions.filter(
    (r) => r.status === "ACTIVE" && (!profId || r.professionalId === profId)
  );
  const lastRx = [...store.prescriptions]
    .filter((r) => !profId || r.professionalId === profId)
    .sort((a, b) => (b.signedAt || "").localeCompare(a.signedAt || ""))[0];
  const reportsAll = store.reports.filter((r) => !profId || r.professionalId === profId);
  return {
    patientsActive: patients.filter((p) => p.status === "ACTIVE").length,
    sessionsToday: sessionsToday.length,
    sessionsCancelledToday: cancelledToday.length,
    prescriptionsActive: rxActive.length,
    lastPrescriptionTime: lastRx?.signedAt || null,
    reportsGenerated: reportsAll.filter((r) => r.status === "LOCKED").length,
    reportsProgress: reportsAll.filter((r) => r.status !== "LOCKED").length,
  };
}

export async function getTodaySessions() {
  await delay();
  const store = db();
  const profId = currentProfId();
  return store.sessions
    .filter((s) => isToday(s.scheduledAt) && (!profId || s.professionalId === profId))
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
    .map((s) => ({
      id: s.id,
      time: s.scheduledAt,
      patientName: s.patientName || patientName(store, s.patientId),
      status: s.status,
    }));
}

export async function getRecentNotes() {
  await delay();
  const store = db();
  const profId = currentProfId();
  return store.notes
    .filter((n) => n.status === "CLOSED" && (!profId || n.professionalId === profId))
    .sort((a, b) => (b.closedAt || "").localeCompare(a.closedAt || ""))
    .slice(0, 5)
    .map((n) => ({
      id: n.id,
      patientId: n.patientId,
      patientName: patientName(store, n.patientId),
      closedAt: n.closedAt,
    }));
}

export async function getRecentPrescriptions() {
  await delay();
  const store = db();
  const profId = currentProfId();
  return store.prescriptions
    .filter((r) => !profId || r.professionalId === profId)
    .sort((a, b) => (b.signedAt || "").localeCompare(a.signedAt || ""))
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      patientId: r.patientId,
      patientName: r.patientName || patientName(store, r.patientId),
      folio: r.folio,
      signedAt: r.signedAt,
    }));
}

export async function getIncompleteHistories() {
  await delay();
  const store = db();
  const profId = currentProfId();
  return Object.values(store.histories || {})
    .filter(
      (h) =>
        (h.completionPercentage || 0) < 100 && (!profId || h.professionalId === profId)
    )
    .map((h) => ({
      id: h.patientId,
      patientId: h.patientId,
      patientName:
        `${h.firstName || ""} ${h.lastName || ""}`.trim() ||
        patientName(store, h.patientId),
      completionPercentage: h.completionPercentage || 0,
      missingFieldsCount: h.missingFieldsCount || 0,
      lastUpdated: h.updatedAt || null,
    }));
}

export default {
  getStats,
  getTodaySessions,
  getRecentNotes,
  getRecentPrescriptions,
  getIncompleteHistories,
};
