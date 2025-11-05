import { patients, uid } from "./memory.js";

const prescriptions = [];

function buildPatientName(patient) {
  if (!patient) {
    return "Paciente sin expediente";
  }
  const parts = [patient.firstName, patient.lastName].filter(Boolean);
  const full = parts.join(" ").trim();
  return full || patient.curp || patient.email || "Paciente sin nombre";
}

function seedPrescriptions() {
  if (prescriptions.length) {
    return;
  }

  const patientList = Array.from(patients.values());
  const fallbackPatient =
    patientList[0] ||
    {
      id: uid("pat_"),
      firstName: "Paciente",
      lastName: "Demo",
    };

  const now = Date.now();
  const folios = ["RX-4581", "RX-4580", "RX-4579", "RX-4578", "RX-4577"];

  for (let index = 0; index < folios.length; index += 1) {
    const patient = patientList[index % Math.max(1, patientList.length)] || fallbackPatient;
    prescriptions.push({
      id: uid("prx_"),
      patientId: patient.id,
      patientName: buildPatientName(patient),
      folio: folios[index],
      signedAt: new Date(now - index * 60 * 60 * 1000 * 6).toISOString(),
      status: index < 3 ? "active" : "completed",
    });
  }
}

seedPrescriptions();

export function getPrescriptions() {
  return prescriptions.map((item) => ({ ...item }));
}

export function addPrescription(entry) {
  const record = {
    id: entry.id || uid("prx_"),
    patientId: entry.patientId,
    patientName: entry.patientName || "Paciente",
    folio: entry.folio || `RX-${Math.floor(Math.random() * 9000) + 1000}`,
    signedAt: entry.signedAt || new Date().toISOString(),
    status: entry.status || "active",
  };
  prescriptions.unshift(record);
  return record;
}

export function countActivePrescriptions() {
  return prescriptions.reduce((count, item) => (item.status === "active" ? count + 1 : count), 0);
}

export default {
  getPrescriptions,
  addPrescription,
  countActivePrescriptions,
};
