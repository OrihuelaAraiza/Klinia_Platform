import crypto from "node:crypto";
import {
  patients,
  historiesByPatient,
  notesByPatient,
  consentsByPatient,
} from "../store/memory.js";

function sorter(value, seen) {
  if (value && typeof value === "object") {
    if (seen.has(value)) {
      return null;
    }
    seen.add(value);

    if (Array.isArray(value)) {
      return value.map((entry) => sorter(entry, seen));
    }

    return Object.keys(value)
      .sort()
      .reduce((accumulator, key) => {
        accumulator[key] = sorter(value[key], seen);
        return accumulator;
      }, {});
  }

  return value;
}

/** Stable stringify (canonical JSON) */
export function canonicalize(object) {
  const seen = new WeakSet();
  const normalized = sorter(object, seen);
  return JSON.stringify(normalized);
}

export function sha256Hex(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function normalizeNamePart(value) {
  return (value || "").toString().trim();
}

function mapNotes(notes = []) {
  return notes
    .slice()
    .sort((a, b) => (b.datetime || "").localeCompare(a.datetime || ""))
    .map((note) => ({
      id: note.id,
      datetime: note.datetime,
      professional: note.professional,
      subjective: note.subjective,
      objective: note.objective,
      analysis: note.analysis,
      plan: note.plan,
      diagnoses: note.diagnoses || [],
      status: note.status,
      closedAt: note.closedAt || null,
      addenda: note.addenda || [],
    }));
}

function mapConsents(consents = []) {
  return consents.map((consent) => ({
    id: consent.id,
    type: consent.type,
    status: consent.status,
    timestamp: consent.timestamp,
    professional: consent.professional,
  }));
}

function mapAttachments(patient) {
  return (patient.attachments || []).map((attachment) => ({
    id: attachment.id,
    name: attachment.name,
    type: attachment.type,
    size: attachment.size,
  }));
}

/** Compose NOM-024 record JSON */
export function composeRecord(patientId) {
  const patient = patients.get(patientId);
  if (!patient) {
    return null;
  }

  const history = historiesByPatient.get(patientId) || null;
  const notes = notesByPatient.get(patientId) || [];
  const consents = consentsByPatient.get(patientId) || [];

  const nombre = {
    nombre: normalizeNamePart(patient.firstName),
    apellidos: normalizeNamePart(patient.lastName),
  };

  const record = {
    version: "1.0",
    generadoEn: new Date().toISOString(),
    paciente: {
      id: patient.id,
      curp: patient.curp,
      nombre,
      nacimiento: patient.birthDate,
      sexo: patient.sex,
      telefono: patient.phone,
      correo: patient.email,
    },
    historiaClinica: history
      ? {
          createdAt: history.createdAt,
          motive: history.motive,
          psychosocialBackground: history.psychosocialBackground,
          mentalStatusExam: history.mentalStatusExam,
          diagnoses: history.diagnoses || [],
          goals: history.goals,
          therapeuticPlan: history.therapeuticPlan,
          professional: history.professional,
        }
      : null,
    notas: mapNotes(notes),
    consentimientos: mapConsents(consents),
    adjuntos: mapAttachments(patient),
    verificacion: {
      algoritmo: "SHA-256",
      hash: "",
    },
  };

  const canonical = canonicalize(record);
  record.verificacion.hash = sha256Hex(canonical);
  return record;
}

export default {
  canonicalize,
  sha256Hex,
  composeRecord,
};
