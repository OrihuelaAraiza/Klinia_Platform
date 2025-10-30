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

function normalizeSessionOutput(session) {
  return {
    ...session,
  };
}

function ensurePatientExists(patientId) {
  if (!patients.has(patientId)) {
    throw Object.assign(new Error("Patient not found"), { status: 404 });
  }
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

router.get("/sessions", (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message || "Parámetros inválidos" });
  }
  const { q, from, to, status, page, size } = parsed.data;
  const search = q.toLowerCase();
  const fromDate = from ? Date.parse(from) : null;
  const toDate = to ? Date.parse(to) : null;
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
  ensurePatientExists(payload.patientId);
  const now = new Date().toISOString();
  const id = uid("ses_");
  const session = {
    id,
    patientId: payload.patientId,
    patientName: payload.patientName || "",
    professionalId: payload.professionalId || "",
    professionalName: payload.professionalName || "",
    datetime: payload.datetime,
    durationMin: payload.durationMin,
    status: payload.status,
    noteId: payload.noteId || null,
    notes: payload.notes || "",
    createdAt: now,
    updatedAt: now,
  };

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

  const updates = parsed.data;
  if (updates.patientId) {
    ensurePatientExists(updates.patientId);
    existing.patientId = updates.patientId;
  }
  if (updates.professionalId !== undefined) existing.professionalId = updates.professionalId;
  if (updates.professionalName !== undefined) existing.professionalName = updates.professionalName;
  if (updates.datetime !== undefined) existing.datetime = updates.datetime;
  if (updates.durationMin !== undefined) existing.durationMin = updates.durationMin;
  if (updates.status !== undefined) existing.status = updates.status;
  if (updates.notes !== undefined) existing.notes = updates.notes;

  existing.updatedAt = new Date().toISOString();
  sessions.set(existing.id, existing);
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

export default router;
