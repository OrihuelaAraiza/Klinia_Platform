import { Router } from "express";
import { z } from "zod";
import {
  patients,
  notesByPatient,
  uid,
  pushAuditEvent,
} from "../store/memory.js";
import {
  sessionCreateSchema,
  sessionUpdateSchema,
  sessionStatusSchema,
  sessionLinkNoteSchema,
} from "../validators/sessionSchemas.js";

const SESSION_STATUS = {
  PROGRAMADA: "programada",
  CONFIRMADA: "confirmada",
  ATENDIDA: "atendida",
  NO_PRESENTADA: "no_presentada",
  CANCELADA: "cancelada",
};

const sessions = new Map();
const TERMINAL_STATUSES = new Set([
  SESSION_STATUS.ATENDIDA,
  SESSION_STATUS.NO_PRESENTADA,
  SESSION_STATUS.CANCELADA,
]);

const querySchema = z.object({
  q: z.string().optional().default(""),
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  size: z.coerce.number().int().positive().max(100).default(10),
});

const byPatientQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  size: z.coerce.number().int().positive().max(100).default(10),
});

const router = Router();

function getSessionsArray() {
  return Array.from(sessions.values());
}

function paginate(items, page, size) {
  const total = items.length;
  const start = (page - 1) * size;
  const paginated = items.slice(start, start + size);
  return {
    items: paginated,
    page,
    size,
    total,
  };
}

function matchFilters(item, { search, fromDate, toDate, status }) {
  if (search) {
    const target = [item.patientName, item.professionalName, item.patientId]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!target.includes(search)) {
      return false;
    }
  }
  const dt = item.datetime ? Date.parse(item.datetime) : NaN;
  if (fromDate && !Number.isNaN(dt) && dt < fromDate) {
    return false;
  }
  if (toDate && !Number.isNaN(dt) && dt > toDate) {
    return false;
  }
  if (status && item.status !== status) {
    return false;
  }
  return true;
}

function parseDateParam(value, { endOfDay = false } = {}) {
  if (!value) {
    return null;
  }
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return null;
  }
  if (!endOfDay) {
    return timestamp;
  }
  if (typeof value === "string" && !value.includes("T")) {
    return timestamp + 24 * 60 * 60 * 1000 - 1;
  }
  return timestamp;
}

function normalizeSessionOutput(session) {
  return {
    ...session,
    modality: session.modality || "presencial",
    location: session.location || "",
  };
}

function ensurePatientExists(patientId) {
  const patient = patients.get(patientId);
  if (!patient) {
    throw Object.assign(new Error("Patient not found"), { status: 404 });
  }
  return patient;
}

function buildPatientName(patient, fallbackId) {
  if (!patient) {
    return fallbackId || "";
  }
  const parts = [patient.firstName, patient.lastName].filter(Boolean);
  const full = parts.join(" ").trim();
  return full || patient.curp || fallbackId || patient.id;
}

function ensureVirtualLocation(session) {
  session.location = session.location ? session.location.trim() : "";
  if (session.modality !== "virtual") {
    return;
  }
  if (!session.location) {
    throw Object.assign(new Error("Las sesiones virtuales requieren un vínculo"), {
      status: 400,
    });
  }
  let parsed;
  try {
    parsed = new URL(session.location);
  } catch {
    throw Object.assign(new Error("Link virtual inválido"), { status: 400 });
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw Object.assign(new Error("El link virtual debe ser HTTP/HTTPS"), { status: 400 });
  }
  session.location = parsed.toString();
}

function getTodayBounds(reference = new Date()) {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { startMs: start.getTime(), endMs: end.getTime() };
}

function formatForIcs(date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcsText(value = "") {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function assertStatusTransition(current, next) {
  const transitions = {
    [SESSION_STATUS.PROGRAMADA]: [
      SESSION_STATUS.CONFIRMADA,
      SESSION_STATUS.CANCELADA,
    ],
    [SESSION_STATUS.CONFIRMADA]: [
      SESSION_STATUS.ATENDIDA,
      SESSION_STATUS.NO_PRESENTADA,
      SESSION_STATUS.CANCELADA,
    ],
    [SESSION_STATUS.ATENDIDA]: [],
    [SESSION_STATUS.NO_PRESENTADA]: [],
    [SESSION_STATUS.CANCELADA]: [],
  };

  const allowed = transitions[current] ?? [];
  if (!allowed.includes(next)) {
    throw Object.assign(new Error(`Transition from ${current} to ${next} no permitida`), {
      status: 409,
    });
  }
}

router.get("/sessions/today-counts", (req, res) => {
  const { startMs, endMs } = getTodayBounds();
  const list = getSessionsArray().filter((session) => {
    const time = session.datetime ? Date.parse(session.datetime) : NaN;
    if (Number.isNaN(time)) {
      return false;
    }
    return time >= startMs && time < endMs;
  });
  const counts = list.reduce(
    (acc, session) => {
      if (session.status === SESSION_STATUS.CANCELADA) {
        acc.cancelled += 1;
      }
      if (
        session.status === SESSION_STATUS.PROGRAMADA ||
        session.status === SESSION_STATUS.CONFIRMADA
      ) {
        acc.scheduled += 1;
      }
      return acc;
    },
    { scheduled: 0, cancelled: 0, total: list.length }
  );
  res.json(counts);
});

router.get("/sessions", (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message || "Parámetros inválidos" });
  }
  const { q, from, to, status, page, size } = parsed.data;
  const search = q.toLowerCase();
  const fromDate = parseDateParam(from);
  const toDate = parseDateParam(to, { endOfDay: true });
  const filtered = getSessionsArray().filter((session) =>
    matchFilters(session, {
      search,
      fromDate,
      toDate,
      status: status || undefined,
    })
  );
  res.json(paginate(filtered.map(normalizeSessionOutput), Number(page), Number(size)));
});

router.get("/patients/:id/sessions", (req, res) => {
  const parsed = byPatientQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message || "Parámetros inválidos" });
  }
  const { page, size } = parsed.data;
  const list = getSessionsArray().filter((session) => session.patientId === req.params.id);
  res.json(paginate(list.map(normalizeSessionOutput), Number(page), Number(size)));
});

router.post("/sessions", (req, res) => {
  const parsed = sessionCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message || "Datos inválidos" });
  }
  const payload = parsed.data;
  const patient = ensurePatientExists(payload.patientId);
  const now = new Date().toISOString();
  const id = uid("ses_");
  const session = {
    id,
    patientId: payload.patientId,
    patientName: payload.patientName || buildPatientName(patient, payload.patientId),
    professionalId: payload.professionalId || "",
    professionalName: payload.professionalName || "",
    datetime: payload.datetime,
    durationMin: payload.durationMin,
    status: payload.status,
    noteId: payload.noteId || null,
    modality: payload.modality || "presencial",
    location: payload.location?.trim() || "",
    notes: payload.notes?.trim() || "",
    createdAt: now,
    updatedAt: now,
  };
  try {
    ensureVirtualLocation(session);
  } catch (error) {
    return res.status(error.status || 400).json({ message: error.message });
  }

  sessions.set(id, session);
  pushAuditEvent({ event: "session_create", meta: { sessionId: id, patientId: session.patientId }, at: now });
  res.status(201).json(normalizeSessionOutput(session));
});

router.put("/sessions/:id", (req, res) => {
  const parsed = sessionUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message || "Datos inválidos" });
  }
  const existing = sessions.get(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: "Sesión no encontrada" });
  }
  if (TERMINAL_STATUSES.has(existing.status)) {
    return res.status(409).json({ message: "Las sesiones finalizadas no pueden editarse" });
  }

  const updates = parsed.data;
  if (updates.patientId) {
    const patient = ensurePatientExists(updates.patientId);
    existing.patientId = updates.patientId;
    existing.patientName = buildPatientName(patient, updates.patientId);
  }
  if (updates.professionalId !== undefined) existing.professionalId = updates.professionalId;
  if (updates.professionalName !== undefined) existing.professionalName = updates.professionalName;
  if (updates.datetime !== undefined) existing.datetime = updates.datetime;
  if (updates.durationMin !== undefined) existing.durationMin = updates.durationMin;
  if (updates.status !== undefined) existing.status = updates.status;
  if (updates.modality !== undefined) existing.modality = updates.modality;
  if (updates.location !== undefined) existing.location = updates.location;
  if (updates.notes !== undefined) existing.notes = updates.notes?.trim() || "";

  try {
    ensureVirtualLocation(existing);
  } catch (error) {
    return res.status(error.status || 400).json({ message: error.message });
  }

  existing.updatedAt = new Date().toISOString();
  sessions.set(existing.id, existing);
  pushAuditEvent({
    event: "session_update",
    meta: { sessionId: existing.id, patientId: existing.patientId, changes: Object.keys(updates) },
    at: existing.updatedAt,
  });
  res.json(normalizeSessionOutput(existing));
});

router.put("/sessions/:id/status", (req, res) => {
  const parsed = sessionStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message || "Datos inválidos" });
  }
  const existing = sessions.get(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: "Sesión no encontrada" });
  }
  const nextStatus = parsed.data.status;
  try {
    assertStatusTransition(existing.status, nextStatus);
  } catch (error) {
    return res.status(error.status || 409).json({ message: error.message });
  }
  existing.status = nextStatus;
  existing.updatedAt = new Date().toISOString();
  sessions.set(existing.id, existing);
  pushAuditEvent({
    event: "session_status_change",
    meta: { sessionId: existing.id, patientId: existing.patientId, status: nextStatus },
    at: existing.updatedAt,
  });
  res.json(normalizeSessionOutput(existing));
});

router.put("/sessions/:id/link-note", (req, res) => {
  const parsed = sessionLinkNoteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message || "Datos inválidos" });
  }
  const existing = sessions.get(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: "Sesión no encontrada" });
  }
  const noteId = parsed.data.noteId;
  const patientNotes = notesByPatient.get(existing.patientId) || [];
  const noteExists = patientNotes.some((note) => note.id === noteId);
  if (!noteExists) {
    return res.status(404).json({ message: "Nota no encontrada para este paciente" });
  }
  existing.noteId = noteId;
  existing.updatedAt = new Date().toISOString();
  sessions.set(existing.id, existing);
  pushAuditEvent({
    event: "session_note_link",
    meta: { sessionId: existing.id, patientId: existing.patientId, noteId },
    at: existing.updatedAt,
  });
  res.json(normalizeSessionOutput(existing));
});

router.get("/sessions/:id.ics", (req, res) => {
  const existing = sessions.get(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: "Sesión no encontrada" });
  }
  if (!existing.datetime) {
    return res.status(400).json({ message: "La sesión no tiene fecha programada" });
  }
  const start = new Date(existing.datetime);
  if (Number.isNaN(start.getTime())) {
    return res.status(400).json({ message: "Fecha inválida" });
  }
  const duration = Number(existing.durationMin || 50);
  const end = new Date(start.getTime() + duration * 60 * 1000);
  const STATUS_TO_ICS = {
    [SESSION_STATUS.PROGRAMADA]: "TENTATIVE",
    [SESSION_STATUS.CONFIRMADA]: "CONFIRMED",
    [SESSION_STATUS.ATENDIDA]: "COMPLETED",
    [SESSION_STATUS.NO_PRESENTADA]: "DECLINED",
    [SESSION_STATUS.CANCELADA]: "CANCELLED",
  };
  const payload = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Klinia//Sessions//ES",
    "BEGIN:VEVENT",
    `UID:${existing.id}@klinialabs.mx`,
    `DTSTAMP:${formatForIcs(new Date())}`,
    `DTSTART:${formatForIcs(start)}`,
    `DTEND:${formatForIcs(end)}`,
    `SUMMARY:${escapeIcsText(`Sesión con ${existing.patientName || "paciente"}`)}`,
    existing.location ? `LOCATION:${escapeIcsText(existing.location)}` : null,
    existing.notes ? `DESCRIPTION:${escapeIcsText(existing.notes)}` : null,
    `STATUS:${STATUS_TO_ICS[existing.status] || "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="session-${existing.id}.ics"`);
  res.send(payload);
});

export default router;
