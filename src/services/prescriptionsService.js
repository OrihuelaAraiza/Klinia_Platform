import { db, persist, uid, delay, nowIso } from "./mocks/db";
import { getUser } from "./storage";

function ensureId(id) {
  const normalized = String(id || "").trim();
  if (!normalized || normalized === "undefined") {
    throw new Error("Selecciona un paciente válido antes de continuar.");
  }
  return normalized;
}

function nextFolio(store) {
  const year = new Date().getFullYear();
  const count =
    store.prescriptions.filter((r) => (r.folio || "").startsWith(`RX-${year}`)).length + 1;
  return `RX-${year}-${String(count).padStart(4, "0")}`;
}

function patientName(store, patientId) {
  const p = store.patients.find((x) => x.id === patientId);
  return p ? `${p.firstName} ${p.lastName}` : "Paciente";
}

export async function create(payload) {
  await delay();
  const store = db();
  const user = getUser();
  const patientId = ensureId(payload?.patientRecordId || payload?.patientId);
  const rx = {
    id: uid("rx"),
    patientRecordId: patientId,
    patientId,
    patientName: patientName(store, patientId),
    professionalId: user?.id || "prof_demo_1",
    folio: nextFolio(store),
    status: "ACTIVE",
    medications: payload?.medications || [],
    indications: payload?.indications || "",
    signedAt: nowIso(),
    createdAt: nowIso(),
    ...payload,
  };
  store.prescriptions.push(rx);
  persist();
  return rx;
}

export async function listByPatient(patientRecordId) {
  await delay();
  const id = ensureId(patientRecordId);
  const store = db();
  return store.prescriptions
    .filter((r) => r.patientRecordId === id || r.patientId === id)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function listMyPrescriptions() {
  await delay();
  const store = db();
  const user = getUser();
  if (!user) return [];
  const patient = store.patients.find(
    (p) => p.userId === user.id || p.id === user.patientId
  );
  if (!patient) return [];
  return store.prescriptions
    .filter((r) => r.patientId === patient.id)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function getOne(id) {
  await delay();
  const store = db();
  const rx = store.prescriptions.find((r) => r.id === id);
  if (!rx) {
    const err = new Error("Receta no encontrada.");
    err.status = 404;
    throw err;
  }
  return rx;
}

export async function suspend(id) {
  await delay();
  const store = db();
  const rx = store.prescriptions.find((r) => r.id === id);
  if (!rx) {
    const err = new Error("Receta no encontrada.");
    err.status = 404;
    throw err;
  }
  rx.status = "SUSPENDED";
  rx.suspendedAt = nowIso();
  persist();
  return rx;
}

export default {
  create,
  listByPatient,
  listMyPrescriptions,
  getOne,
  suspend,
};
