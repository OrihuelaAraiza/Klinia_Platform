export const patientSchema = {
  id: "string",
  curp: "string",
  name: { first: "string", last: "string" },
  birthDate: "YYYY-MM-DD",
  sex: "M|F|X",
  phone: "string",
  email: "string",
  attachments: [{ type: "PDF|JPG|PNG", url: "string" }],
};

export const historySchema = {
  patientId: "string",
  motive: "string",
  psychosocialBackground: "string",
  mentalStatusExam: "string",
  diagnoses: [{ code: "CIE-10", label: "string" }],
  goals: "string",
  therapeuticPlan: "string",
  versions: [{ versionId: "string", closedAt: "ISO-8601" }],
};

export const noteSchema = {
  noteId: "string",
  patientId: "string",
  datetime: "ISO-8601",
  professional: { id: "string", name: "string", license: "string" },
  subjective: "string",
  objective: "string",
  activeProblems: [{ code: "CIE-10", label: "string" }],
  plan: "string",
  signed: true,
  amendments: [{ datetime: "ISO-8601", author: "string", text: "string" }],
};

export const consentSchema = {
  patientId: "string",
  type: "attention|recording|ai_use",
  status: "signed|revoked|pending",
  professional: "string",
  signedAt: "ISO-8601",
};

export const prescriptionSchema = {
  folio: "string",
  patientId: "string",
  professional: { id: "string", name: "string", license: "string" },
  items: [
    {
      substance: "string",
      form: "string",
      dose: "string",
      route: "string",
      frequency: "string",
      duration: "string",
      notes: "string",
    },
  ],
  issuedAt: "ISO-8601",
  signature: "image|hash",
  verificationCode: "string",
};

export const exportSchema = {
  patient: patientSchema,
  professional: { id: "string", name: "string", role: "string" },
  history: historySchema,
  notes: [noteSchema],
  diagnoses: [{ code: "CIE-10", label: "string" }],
  prescriptions: [prescriptionSchema],
  consents: [consentSchema],
  attachments: [{ type: "string", url: "string" }],
  audit: [{ event: "login|create_note|export", userId: "string", timestamp: "ISO-8601" }],
};

export default {
  patientSchema,
  historySchema,
  noteSchema,
  consentSchema,
  prescriptionSchema,
  exportSchema,
};
