export const historySchema = {
  patientId: "string",
  motive: "string",
  psychosocialBackground: "string",
  mentalStatusExam: "string",
  diagnoses: [{ code: "CIE-10", label: "string" }],
  goals: "string",
  therapeuticPlan: "string",
  professional: { id: "string", name: "string", license: "string" },
  createdAt: "ISO-8601",
  versions: [{ versionId: "string", closedAt: "ISO-8601" }],
};

export default historySchema;
