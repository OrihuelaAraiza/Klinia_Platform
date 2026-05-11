import { db, persist, uid, delay, paginate, nowIso } from "./mocks/db";
import { getUser } from "./storage";

function currentProfId() {
  const u = getUser();
  return u?.id || "prof_demo_1";
}

function notFound() {
  const err = new Error("Paciente no encontrado.");
  err.status = 404;
  return err;
}

export async function listPatients({ q = "", page = 1, size = 50, professionalId = "" } = {}) {
  await delay();
  const data = db();
  let items = [...data.patients];
  if (professionalId) {
    items = items.filter((p) => p.professionalId === professionalId);
  }
  if (q?.trim()) {
    const needle = q.toLowerCase();
    items = items.filter(
      (p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(needle) ||
        (p.curp || "").toLowerCase().includes(needle) ||
        (p.email || "").toLowerCase().includes(needle) ||
        (p.phone || "").toLowerCase().includes(needle)
    );
  }
  return paginate(items, { page, size });
}

export async function getPatient(id) {
  await delay();
  const data = db();
  const p = data.patients.find((x) => x.id === id);
  if (!p) throw notFound();
  return p;
}

export async function createPatient(payload) {
  await delay();
  const data = db();
  const newPatient = {
    id: uid("pat"),
    professionalId: payload?.professionalId || currentProfId(),
    status: "ACTIVE",
    attachments: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ...payload,
  };
  data.patients.unshift(newPatient);
  persist();
  return newPatient;
}

export async function updatePatient(id, payload) {
  await delay();
  const data = db();
  const idx = data.patients.findIndex((p) => p.id === id);
  if (idx === -1) throw notFound();
  data.patients[idx] = {
    ...data.patients[idx],
    ...payload,
    id,
    updatedAt: nowIso(),
  };
  persist();
  return data.patients[idx];
}

export async function importAndReassign(payload) {
  await delay();
  const data = db();
  const newProfId = payload?.toProfessionalId || currentProfId();
  const ids = payload?.patientIds || [];
  data.patients = data.patients.map((p) =>
    ids.includes(p.id) ? { ...p, professionalId: newProfId, updatedAt: nowIso() } : p
  );
  persist();
  return { reassigned: ids.length };
}

export async function uploadAttachment(id, formData) {
  await delay();
  const data = db();
  const patient = data.patients.find((p) => p.id === id);
  if (!patient) throw notFound();
  const file = formData?.get ? formData.get("file") : null;
  const fileName = file?.name || `archivo-${Date.now()}.pdf`;
  const attachment = {
    id: uid("att"),
    blobName: `mock/${id}/${fileName}`,
    fileName,
    mimeType: file?.type || "application/octet-stream",
    size: file?.size || 0,
    uploadedAt: nowIso(),
  };
  patient.attachments = [...(patient.attachments || []), attachment];
  persist();
  return attachment;
}

export async function getAttachmentUrl(/* patientId, blobName */) {
  await delay(60);
  return { url: "#mock-attachment", expiresAt: nowIso() };
}

export async function deleteAttachment(patientId, attachmentId) {
  await delay();
  const data = db();
  const patient = data.patients.find((p) => p.id === patientId);
  if (!patient) throw notFound();
  patient.attachments = (patient.attachments || []).filter((a) => a.id !== attachmentId);
  persist();
  return { ok: true };
}

export async function getProfessionalsList() {
  await delay();
  const data = db();
  return data.users
    .filter((u) => u.role === "PROFESSIONAL")
    .map((u) => ({
      id: u.id,
      name: u.name,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      specialty: u.specialty,
    }));
}

export async function createDischargeNote(data) {
  await delay();
  const { patientId, ...payload } = data;
  const store = db();
  const patient = store.patients.find((p) => p.id === patientId);
  if (!patient) throw notFound();
  patient.status = "DISCHARGED";
  patient.dischargeReason = payload.reason || "OTRO";
  patient.dischargeNote = payload.note || "";
  patient.dischargeResult = payload.result || "RESUELTO";
  patient.dischargedAt = nowIso();
  patient.updatedAt = nowIso();
  persist();
  return { ok: true, patient };
}

export async function getMyProfile() {
  await delay();
  const u = getUser();
  if (!u) {
    const err = new Error("Sesión no iniciada.");
    err.status = 401;
    throw err;
  }
  const store = db();
  if (u.role === "PATIENT") {
    const patient =
      store.patients.find((p) => p.userId === u.id) ||
      store.patients.find((p) => p.id === u.patientId);
    if (patient) return patient;
  }
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    phone: u.phone,
    role: u.role,
  };
}

export async function updateMyProfile(payload) {
  await delay();
  const u = getUser();
  const store = db();
  if (u?.role === "PATIENT") {
    const patient = store.patients.find((p) => p.userId === u.id || p.id === u.patientId);
    if (patient) {
      Object.assign(patient, payload, { updatedAt: nowIso() });
      persist();
      return patient;
    }
  }
  const userRecord = store.users.find((x) => x.id === u?.id);
  if (userRecord) {
    Object.assign(userRecord, payload);
    persist();
  }
  return { ...u, ...payload };
}

export async function requestPhoneVerification() {
  await delay();
  return { sent: true, code: "123456" };
}

export async function getMyDocuments(patientId) {
  await delay();
  const store = db();
  const patient = store.patients.find((p) => p.id === patientId);
  return patient?.attachments || [];
}

export async function listMyTherapists() {
  await delay();
  const store = db();
  const u = getUser();
  const patient = store.patients.find((p) => p.userId === u?.id || p.id === u?.patientId);
  if (!patient) return [];
  const prof = store.users.find((x) => x.id === patient.professionalId);
  return prof ? [prof] : [];
}

export async function reingressPatient(id, reason) {
  await delay();
  const store = db();
  const patient = store.patients.find((p) => p.id === id);
  if (!patient) throw notFound();
  patient.status = "ACTIVE";
  patient.reingressReason = reason;
  patient.updatedAt = nowIso();
  persist();
  return patient;
}

export async function globalSearch(query) {
  const { items } = await listPatients({ q: query, page: 1, size: 20 });
  return items;
}

export default {
  listPatients,
  getPatient,
  createPatient,
  updatePatient,
  importAndReassign,
  uploadAttachment,
  getAttachmentUrl,
  deleteAttachment,
  getProfessionalsList,
  getMyProfile,
  updateMyProfile,
  requestPhoneVerification,
  getMyDocuments,
  listMyTherapists,
  createDischargeNote,
  reingressPatient,
  globalSearch,
};
