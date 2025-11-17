function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function canonicalize(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  }

  if (isObject(value)) {
    const entries = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`);
    return `{${entries.join(",")}}`;
  }

  return JSON.stringify(value);
}

export async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const cryptoRef = globalThis.crypto || (globalThis.window && window.crypto);
  if (!cryptoRef?.subtle) {
    throw new Error("Crypto API no disponible para generar hash.");
  }
  const hashBuffer = await cryptoRef.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function mapPatient(patient = {}) {
  return {
    id: patient.id ?? "",
    curp: patient.curp ?? "",
    nombre: {
      nombre: patient.firstName ?? "",
      apellidos: patient.lastName ?? "",
    },
    nacimiento: patient.birthDate ?? "",
    sexo: patient.sex ?? "",
    telefono: patient.phone ?? "",
    correo: patient.email ?? "",
  };
}

function mapHistory(history) {
  if (!history) return null;
  return {
    createdAt: history.createdAt ?? "",
    motive: history.motive ?? "",
    psychosocialBackground: history.psychosocialBackground ?? "",
    mentalStatusExam: history.mentalStatusExam ?? "",
    diagnoses: Array.isArray(history.diagnoses) ? history.diagnoses : [],
    goals: history.goals ?? "",
    therapeuticPlan: history.therapeuticPlan ?? "",
    professional: history.professional ?? {},
  };
}

function mapNotes(notes) {
  if (!Array.isArray(notes)) return [];
  return notes.map((note) => ({
    id: note.id ?? "",
    datetime: note.datetime ?? "",
    professional: note.professional ?? {},
    subjective: note.subjective ?? "",
    objective: note.objective ?? "",
    analysis: note.analysis ?? "",
    plan: note.plan ?? "",
    diagnoses: Array.isArray(note.diagnoses) ? note.diagnoses : [],
    status: note.status ?? "open",
    closedAt: note.closedAt ?? "",
    addenda: Array.isArray(note.addenda ?? note.addendums)
      ? (note.addenda ?? note.addendums)
      : [],
  }));
}

function mapConsents(consents) {
  if (!Array.isArray(consents)) return [];
  return consents.map((consent) => ({
    id: consent.id ?? "",
    type: consent.type ?? "",
    status: consent.status ?? "pending",
    timestamp: consent.timestamp ?? "",
    professional: consent.professional ?? "",
  }));
}

function mapAttachments(patient) {
  if (!Array.isArray(patient?.attachments)) {
    return [];
  }
  const fallbackId = () => `att-${Math.random().toString(36).slice(2, 10)}`;
  return patient.attachments.map((file) => ({
    id: file.id ?? (globalThis.crypto?.randomUUID?.() || fallbackId()),
    name: file.name ?? "",
    type: file.type ?? "",
    size: Number(file.size ?? 0),
  }));
}

async function mapPrescriptions(prescriptions) {
  if (!Array.isArray(prescriptions)) {
    return [];
  }
  return Promise.all(
    prescriptions.map(async (item) => {
      const payload = {
        folio: item.folio ?? "",
        fecha: item.createdAt ?? item.signedAt ?? "",
        principioActivo: item.substance ?? "",
        forma: item.form ?? "",
        dosis: item.dose ?? "",
        via: item.route ?? "",
        frecuencia: item.frequency ?? "",
        duracion: item.duration ?? "",
        indicaciones: item.notes ?? "",
        estado: item.status ?? "vigente",
      };
      const canonical = canonicalize(payload);
      payload.hash = await sha256(canonical);
      return payload;
    })
  );
}

export async function composeRecord(patient, history, notes, consents, prescriptions = []) {
  const mappedPrescriptions = await mapPrescriptions(prescriptions);
  const record = {
    version: "1.0",
    generadoEn: new Date().toISOString(),
    paciente: mapPatient(patient),
    historiaClinica: mapHistory(history),
    notas: mapNotes(notes),
    consentimientos: mapConsents(consents),
    prescripciones: mappedPrescriptions,
    adjuntos: mapAttachments(patient),
    verificacion: {
      algoritmo: "SHA-256",
      hash: "",
    },
  };

  const canonical = canonicalize(record);
  const hash = await sha256(canonical);
  record.verificacion.hash = hash;
  return record;
}

export default {
  composeRecord,
  canonicalize,
  sha256,
};
