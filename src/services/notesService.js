import { db, persist, uid, delay, paginate, nowIso } from "./mocks/db";
import { getUser } from "./storage";

function ensureNoteId(noteId) {
  const normalized = String(noteId || "").trim();
  if (!normalized) throw new Error("ID de nota requerido.");
  return normalized;
}

function notFound() {
  const err = new Error("Nota no encontrada.");
  err.status = 404;
  return err;
}

export async function listNotes(patientId, params = {}) {
  if (!patientId) return { items: [], total: 0 };
  await delay();
  const store = db();
  const items = store.notes
    .filter((n) => n.patientId === patientId)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return paginate(items, params);
}

export async function createNote(patientId, payload) {
  await delay();
  const store = db();
  const user = getUser();
  const note = {
    patientId,
    professionalId: user?.id || "prof_demo_1",
    sessionId: null,
    title: payload?.title || "Nota",
    content: payload?.content || "",
    status: "DRAFT",
    signature: null,
    addendums: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
    closedAt: null,
    ...payload,
    id: uid("note"),
  };
  store.notes.unshift(note);
  persist();
  return note;
}

export async function getNote(_patientId, noteId) {
  await delay();
  const id = ensureNoteId(noteId);
  const store = db();
  const note = store.notes.find((n) => n.id === id);
  if (!note) throw notFound();
  return note;
}

export async function updateNote(_patientId, noteId, payload) {
  await delay();
  const id = ensureNoteId(noteId);
  const store = db();
  const idx = store.notes.findIndex((n) => n.id === id);
  if (idx === -1) throw notFound();
  if (store.notes[idx].status === "CLOSED") {
    const err = new Error("La nota está cerrada y no puede modificarse.");
    err.status = 409;
    throw err;
  }
  store.notes[idx] = { ...store.notes[idx], ...payload, id, updatedAt: nowIso() };
  persist();
  return store.notes[idx];
}

export async function closeNote(_patientId, noteId) {
  await delay();
  const id = ensureNoteId(noteId);
  const store = db();
  const note = store.notes.find((n) => n.id === id);
  if (!note) throw notFound();
  note.status = "CLOSED";
  note.closedAt = nowIso();
  note.updatedAt = nowIso();
  persist();
  return note;
}

export async function signNote(_patientId, noteId, signature) {
  await delay();
  const id = ensureNoteId(noteId);
  if (!signature) throw new Error("Firma requerida.");
  const store = db();
  const note = store.notes.find((n) => n.id === id);
  if (!note) throw notFound();
  note.signature = signature;
  note.status = "SIGNED";
  note.updatedAt = nowIso();
  persist();
  return note;
}

export async function addAddendum(_patientId, noteId, text) {
  await delay();
  const id = ensureNoteId(noteId);
  const store = db();
  const note = store.notes.find((n) => n.id === id);
  if (!note) throw notFound();
  note.addendums = [...(note.addendums || []), { id: uid("ad"), text, at: nowIso() }];
  note.updatedAt = nowIso();
  persist();
  return note;
}

export default {
  listNotes,
  createNote,
  getNote,
  updateNote,
  closeNote,
  signNote,
  addAddendum,
};
