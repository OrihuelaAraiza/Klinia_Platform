import { Router } from "express";
import { patients, notesByPatient, getAuditEvents } from "../store/memory.js";
import { SESSION_STATUS, getSessionsArray, getTodayBounds } from "./sessions.js";
import { getPrescriptions, countActivePrescriptions } from "../store/prescriptions.js";

const router = Router();

function buildPatientName(patientId) {
  const patient = patients.get(patientId);
  if (!patient) {
    return "Paciente sin expediente";
  }
  const parts = [patient.firstName, patient.lastName].filter(Boolean);
  const full = parts.join(" ").trim();
  return full || patient.curp || patient.email || "Paciente sin nombre";
}

function pickLatestTimestamp(items, field) {
  return items.reduce((latest, item) => {
    const candidate = item[field];
    if (!candidate) {
      return latest;
    }
    const candidateDate = Date.parse(candidate);
    if (Number.isNaN(candidateDate)) {
      return latest;
    }
    if (!latest) {
      return candidate;
    }
    const latestDate = Date.parse(latest);
    if (Number.isNaN(latestDate) || candidateDate > latestDate) {
      return candidate;
    }
    return latest;
  }, null);
}

function collectTodaySessions() {
  const list = getSessionsArray();
  const { startMs, endMs } = getTodayBounds();
  return list
    .filter((session) => {
      const timestamp = session.datetime ? Date.parse(session.datetime) : NaN;
      if (Number.isNaN(timestamp)) {
        return false;
      }
      return timestamp >= startMs && timestamp < endMs;
    })
    .sort((a, b) => {
      const timeA = a.datetime ? Date.parse(a.datetime) : 0;
      const timeB = b.datetime ? Date.parse(b.datetime) : 0;
      return timeA - timeB;
    });
}

router.get("/dashboard/stats", (req, res) => {
  const todaySessions = collectTodaySessions();
  const prescriptions = getPrescriptions();
  const activePrescriptions = countActivePrescriptions();
  const lastPrescriptionTime = pickLatestTimestamp(prescriptions, "createdAt");
  const auditEvents = getAuditEvents();

  const sessionsToday = todaySessions.length;
  const sessionsCancelledToday = todaySessions.filter(
    (session) => session.status === SESSION_STATUS.CANCELADA
  ).length;

  const patientsActive = patients.size;
  const reportsGeneratedBase = Math.max(
    4,
    Math.round(auditEvents.length / 3) + sessionsToday + patientsActive
  );

  const reportsProgress = Math.min(
    100,
    Math.max(12, Math.round((reportsGeneratedBase / Math.max(patientsActive || 1, 1)) * 42))
  );

  res.json({
    patientsActive,
    sessionsToday,
    sessionsCancelledToday,
    prescriptionsActive: activePrescriptions,
    lastPrescriptionTime,
    reportsGenerated: reportsGeneratedBase,
    reportsProgress,
  });
});

router.get("/dashboard/sessions/today", (req, res) => {
  const todaySessions = collectTodaySessions()
    .slice(0, 5)
    .map((session) => ({
      id: session.id,
      time: session.datetime,
      patientName: session.patientName || buildPatientName(session.patientId),
      status: session.status,
    }));
  res.json(todaySessions);
});

router.get("/dashboard/notes/recent", (req, res) => {
  const entries = [];
  notesByPatient.forEach((collection, patientId) => {
    collection.forEach((note) => {
      entries.push({
        id: note.id,
        patientId,
        patientName: buildPatientName(patientId),
        closedAt: note.closedAt || note.updatedAt || note.datetime,
      });
    });
  });

  entries.sort((a, b) => {
    const timeA = a.closedAt ? Date.parse(a.closedAt) : 0;
    const timeB = b.closedAt ? Date.parse(b.closedAt) : 0;
    return timeB - timeA;
  });

  res.json(entries.slice(0, 5));
});

router.get("/dashboard/prescriptions/recent", (req, res) => {
  const prescriptions = getPrescriptions()
    .map((item) => ({
      id: item.id,
      patientId: item.patientId || null,
      patientName: item.patientName,
      folio: item.folio,
      signedAt: item.createdAt,
    }))
    .sort((a, b) => {
      const timeA = a.signedAt ? Date.parse(a.signedAt) : 0;
      const timeB = b.signedAt ? Date.parse(b.signedAt) : 0;
      return timeB - timeA;
    });

  res.json(prescriptions.slice(0, 5));
});

export default router;
