import { patients, uid } from "./memory.js";

const prescriptions = [];
let folioCounter = 458100;

function buildPatientName(patient) {
  if (!patient) {
    return "Paciente sin expediente";
  }
  const parts = [patient.firstName, patient.lastName].filter(Boolean);
  const full = parts.join(" ").trim();
  return full || patient.curp || patient.email || "Paciente sin nombre";
}

function normalizePatient(patient) {
  if (!patient) {
    return null;
  }
  return {
    id: patient.id,
    name: buildPatientName(patient),
    curp: patient.curp || "",
    birthDate: patient.birthDate || "",
    sex: patient.sex || "",
  };
}

function generateFolio() {
  folioCounter += 1;
  return `RX-${folioCounter.toString().padStart(6, "0")}`;
}

function seedPrescriptions() {
  if (prescriptions.length) {
    return;
  }

  const patientList = Array.from(patients.values());
  if (patientList.length === 0) {
    return;
  }
  const now = Date.now();

  for (let index = 0; index < Math.min(4, patientList.length); index += 1) {
    const patient = patientList[index];
    const base = {
      patientId: patient.id,
      patient,
      substance: "Sertralina",
      form: "Tabletas",
      dose: "50 mg",
      route: "Oral",
      frequency: "Cada 24 horas",
      duration: "30 días",
      notes: "Administrar por las noches.",
      professional: {
        name: "Profesional Klinia",
        license: "123456",
      },
      createdAt: new Date(now - index * 86_400_000).toISOString(),
      status: "vigente",
    };
    prescriptions.push(makeRecord(base));
  }
}

function makeRecord(entry) {
  const timestamp = entry.createdAt || new Date().toISOString();
  const patient = normalizePatient(entry.patient || patients.get(entry.patientId));
  const record = {
    id: entry.id || uid("prx_"),
    folio: entry.folio || generateFolio(),
    patientId: patient?.id || entry.patientId,
    patientName: patient?.name || entry.patientName || "Paciente",
    patientCurp: patient?.curp || "",
    patientBirthDate: patient?.birthDate || "",
    patientSex: patient?.sex || "",
    substance: entry.substance,
    form: entry.form,
    dose: entry.dose,
    route: entry.route,
    frequency: entry.frequency,
    duration: entry.duration,
    notes: entry.notes || "",
    professional: entry.professional || { name: "Profesional Klinia" },
    status: entry.status || "vigente",
    createdAt: timestamp,
    updatedAt: entry.updatedAt || timestamp,
    suspendedAt: entry.suspendedAt || null,
  };
  return record;
}

seedPrescriptions();

export function getPrescriptions() {
  return prescriptions.map((item) => ({ ...item }));
}

export function createPrescription(entry) {
  const record = makeRecord(entry);
  prescriptions.unshift(record);
  return { ...record };
}

export function listPrescriptionsByPatient(patientId) {
  return prescriptions.filter((item) => item.patientId === patientId).map((item) => ({ ...item }));
}

export function getPrescriptionById(id) {
  const record = prescriptions.find((item) => item.id === id);
  return record ? { ...record } : null;
}

export function suspendPrescription(id) {
  const record = prescriptions.find((item) => item.id === id);
  if (!record) {
    return null;
  }
  if (record.status !== "suspendida") {
    record.status = "suspendida";
    record.suspendedAt = new Date().toISOString();
    record.updatedAt = record.suspendedAt;
  }
  return { ...record };
}

export function countActivePrescriptions() {
  return prescriptions.reduce((count, item) => (item.status === "vigente" ? count + 1 : count), 0);
}

export default {
  getPrescriptions,
  createPrescription,
  listPrescriptionsByPatient,
  getPrescriptionById,
  suspendPrescription,
  countActivePrescriptions,
};
