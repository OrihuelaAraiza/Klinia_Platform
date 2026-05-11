import { db, persist, delay, nowIso } from "./mocks/db";
import { getUser } from "./storage";

export async function getClinicalHistory(patientId, options = {}) {
  await delay();
  const store = db();
  const profId = options.params?.professionalId;
  const history = store.histories[patientId];
  if (!history) return null;
  if (profId && history.professionalId && history.professionalId !== profId) {
    return null;
  }
  const patient = store.patients.find((p) => p.id === patientId);
  return {
    ...history,
    firstName: history.firstName || patient?.firstName || "",
    lastName: history.lastName || patient?.lastName || "",
    diagnoses: Array.isArray(history.diagnoses) ? history.diagnoses : [],
    patient: patient || null,
  };
}

export async function saveClinicalHistory(patientId, payload) {
  await delay();
  if (!payload || Object.keys(payload).length === 0) {
    throw new Error("El formulario está vacío.");
  }
  const dataToSend = { ...payload };
  const blackList = ["expediente", "nombreCompleto", "curp", "sexo", "nacionalidad"];
  blackList.forEach((key) => delete dataToSend[key]);
  const store = db();
  const user = getUser();
  const existing = store.histories[patientId] || {};
  store.histories[patientId] = {
    ...existing,
    ...dataToSend,
    patientId,
    professionalId: user?.id || existing.professionalId || "prof_demo_1",
    updatedAt: nowIso(),
    createdAt: existing.createdAt || nowIso(),
  };
  persist();
  return store.histories[patientId];
}

export async function getPatientHistory(patientId, professionalId) {
  return getClinicalHistory(patientId, { params: { professionalId } });
}

export default {
  getClinicalHistory,
  saveClinicalHistory,
  getPatientHistory,
};
