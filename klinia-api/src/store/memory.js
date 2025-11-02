export const usersByEmail = new Map();
export const loginBuckets = new Map();
const auditEvents = [];
const MAX_AUDIT_EVENTS = 200;

export const patients = new Map();
export const consentsByPatient = new Map();
export const historiesByPatient = new Map();
export const notesByPatient = new Map();
export const uploadsById = new Map();
export const kycRecordsByUserId = new Map();

function seed() {
  if (patients.size > 0) {
    return;
  }
  const demoId = uid("pat_");
  const now = new Date().toISOString();
  const demoPatient = {
    id: demoId,
    curp: "DEMO890101HDFABC01",
    firstName: "Paciente",
    lastName: "Demo",
    birthDate: "1989-01-01",
    sex: "M",
    phone: "+52 5555555555",
    email: "paciente.demo@example.com",
    attachments: [],
    createdAt: now,
    updatedAt: now,
  };
  patients.set(demoId, demoPatient);
}

seed();

export function uid(prefix = "") {
  return `${prefix}${Math.random().toString(36).slice(2, 10)}`;
}

export function getUserByEmail(email) {
  return usersByEmail.get(email.toLowerCase()) || null;
}

export function hasUser(email) {
  return usersByEmail.has(email.toLowerCase());
}

export function pushAuditEvent(event) {
  auditEvents.push(event);
  if (auditEvents.length > MAX_AUDIT_EVENTS) {
    auditEvents.shift();
  }
}

export function getAuditEvents() {
  return [...auditEvents];
}

export default {
  getUserByEmail,
  hasUser,
  pushAuditEvent,
  getAuditEvents,
  patients,
  consentsByPatient,
  historiesByPatient,
  notesByPatient,
  usersByEmail,
  loginBuckets,
  uploadsById,
  kycRecordsByUserId,
  uid,
};
