import { db, persist, uid, delay, nowIso } from "./mocks/db";
import { getUser } from "./storage";

function ensurePatientId(patientId) {
  const normalized = String(patientId || "").trim();
  if (!normalized) throw new Error("Selecciona un paciente válido antes de continuar.");
  return normalized;
}

function ensureId(id) {
  const normalized = String(id || "").trim();
  if (!normalized) throw new Error("Identificador de orden inválido.");
  return normalized;
}

function nextFolio(store) {
  const year = new Date().getFullYear();
  const count =
    store.orders.filter((r) => (r.folio || "").startsWith(`ORD-${year}`)).length + 1;
  return `ORD-${year}-${String(count).padStart(4, "0")}`;
}

export async function create(payload) {
  await delay();
  const store = db();
  const user = getUser();
  const order = {
    id: uid("ord"),
    patientId: ensurePatientId(payload?.patientId),
    professionalId: user?.id || "prof_demo_1",
    folio: nextFolio(store),
    status: "PENDING",
    createdAt: nowIso(),
    ...payload,
  };
  store.orders.push(order);
  persist();
  return order;
}

export async function listByPatient(patientId) {
  await delay();
  const id = ensurePatientId(patientId);
  const store = db();
  return store.orders
    .filter((o) => o.patientId === id)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function getOne(id) {
  await delay();
  const oid = ensureId(id);
  const store = db();
  const order = store.orders.find((o) => o.id === oid);
  if (!order) {
    const err = new Error("Orden no encontrada.");
    err.status = 404;
    throw err;
  }
  return order;
}

export async function update(orderId, patch) {
  await delay();
  const oid = ensureId(orderId);
  const store = db();
  const idx = store.orders.findIndex((o) => o.id === oid);
  if (idx === -1) {
    const err = new Error("Orden no encontrada.");
    err.status = 404;
    throw err;
  }
  store.orders[idx] = { ...store.orders[idx], ...patch, id: oid, updatedAt: nowIso() };
  persist();
  return store.orders[idx];
}

export async function cancel(orderId) {
  await delay();
  const oid = ensureId(orderId);
  const store = db();
  const order = store.orders.find((o) => o.id === oid);
  if (!order) {
    const err = new Error("Orden no encontrada.");
    err.status = 404;
    throw err;
  }
  order.status = "CANCELLED";
  order.cancelledAt = nowIso();
  persist();
  return order;
}

export default {
  create,
  listByPatient,
  getOne,
  update,
  cancel,
};
