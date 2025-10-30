import { Router } from "express";
import { z } from "zod";
import {
  notesByPatient,
  uid,
  pushAuditEvent,
} from "../store/memory.js";
import { noteCreateSchema, noteAddendumSchema } from "../validators/noteSchemas.js";

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  size: z.coerce.number().int().positive().max(50).default(10),
});

function getNotesCollection(patientId) {
  if (!notesByPatient.has(patientId)) {
    notesByPatient.set(patientId, []);
  }
  return notesByPatient.get(patientId);
}

const router = Router({ mergeParams: true });

router.get("/", (req, res) => {
  const { page, size } = querySchema.parse(req.query);
  const collection = getNotesCollection(req.params.id);
  const sorted = [...collection].sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
  const start = (page - 1) * size;
  const items = sorted.slice(start, start + size);
  pushAuditEvent({ event: "notes_list", meta: { patientId: req.params.id }, at: new Date().toISOString() });
  res.json({ items, page, size, total: sorted.length });
});

router.post("/", (req, res) => {
  const parsed = noteCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid data" });
  }

  const now = new Date().toISOString();
  const note = {
    id: uid("note_"),
    patientId: req.params.id,
    datetime: now,
    professional: parsed.data.professional,
    subjective: parsed.data.subjective,
    objective: parsed.data.objective,
    analysis: parsed.data.analysis,
    plan: parsed.data.plan,
    diagnoses: parsed.data.diagnoses,
    status: "open",
    addenda: [],
    createdAt: now,
    updatedAt: now,
  };

  const collection = getNotesCollection(req.params.id);
  collection.push(note);
  pushAuditEvent({ event: "note_create", meta: { patientId: req.params.id, noteId: note.id }, at: now });

  res.status(201).json(note);
});

router.get("/:noteId", (req, res) => {
  const collection = getNotesCollection(req.params.id);
  const note = collection.find((item) => item.id === req.params.noteId);
  if (!note) {
    return res.status(404).json({ message: "Note not found" });
  }
  pushAuditEvent({ event: "note_view", meta: { patientId: req.params.id, noteId: note.id }, at: new Date().toISOString() });
  res.json(note);
});

router.put("/:noteId/close", (req, res) => {
  const collection = getNotesCollection(req.params.id);
  const note = collection.find((item) => item.id === req.params.noteId);
  if (!note) {
    return res.status(404).json({ message: "Note not found" });
  }
  if (note.status === "closed") {
    return res.status(409).json({ message: "Note already closed" });
  }
  note.status = "closed";
  note.closedAt = new Date().toISOString();
  note.updatedAt = note.closedAt;
  pushAuditEvent({ event: "note_close", meta: { patientId: req.params.id, noteId: note.id, status: "closed" }, at: note.closedAt });
  res.json(note);
});

router.put("/:noteId/addendum", (req, res) => {
  const collection = getNotesCollection(req.params.id);
  const note = collection.find((item) => item.id === req.params.noteId);
  if (!note) {
    return res.status(404).json({ message: "Note not found" });
  }
  if (note.status !== "closed") {
    return res.status(409).json({ message: "Only closed notes accept addendum" });
  }

  const parsed = noteAddendumSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid data" });
  }

  const now = new Date().toISOString();
  const addendum = {
    datetime: now,
    author: note.professional?.name || "Profesional",
    text: parsed.data.text,
  };
  note.addenda = Array.isArray(note.addenda) ? [...note.addenda, addendum] : [addendum];
  note.updatedAt = now;

  pushAuditEvent({ event: "note_addendum", meta: { patientId: req.params.id, noteId: note.id }, at: now });
  res.json(note);
});

router.put("/:noteId/reopen", (req, res) => {
  return res.status(501).json({ message: "Reopen not implemented" });
});

export default router;
