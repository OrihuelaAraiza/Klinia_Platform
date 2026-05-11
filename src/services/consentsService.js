import { db, persist, uid, delay, nowIso } from "./mocks/db";

export async function listConsents(patientId) {
  await delay();
  const store = db();
  return store.consents.filter((c) => c.patientId === patientId);
}

export async function signConsent(patientId, type, extra = {}) {
  await delay();
  const store = db();
  const existing = store.consents.find((c) => c.patientId === patientId && c.type === type);
  if (existing) {
    Object.assign(existing, { status: "signed", signedAt: nowIso(), ...extra });
    persist();
    return existing;
  }
  const consent = {
    id: uid("cns"),
    patientId,
    type,
    status: "signed",
    signedAt: nowIso(),
    ...extra,
  };
  store.consents.push(consent);
  persist();
  return consent;
}

export async function revokeConsent(patientId, consentId, extra = {}) {
  await delay();
  const store = db();
  const consent = store.consents.find((c) => c.id === consentId && c.patientId === patientId);
  if (!consent) {
    const err = new Error("Consentimiento no encontrado.");
    err.status = 404;
    throw err;
  }
  Object.assign(consent, { status: "revoked", revokedAt: nowIso(), ...extra });
  persist();
  return consent;
}

export default {
  listConsents,
  signConsent,
  revokeConsent,
};
