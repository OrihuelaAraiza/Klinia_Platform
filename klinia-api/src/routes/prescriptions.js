import { Router } from "express";
import { z } from "zod";
import { patients } from "../store/memory.js";
import {
  createPrescription,
  listPrescriptionsByPatient,
  getPrescriptionById,
  suspendPrescription,
} from "../store/prescriptions.js";

const router = Router();

const professionalSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().min(1, { message: "Nombre del profesional requerido" }),
    role: z.string().optional(),
    license: z.string().optional(),
  })
  .optional();

const createSchema = z.object({
  patientId: z.string().trim().min(1, { message: "Paciente requerido" }),
  substance: z.string().trim().min(1, { message: "Principio activo requerido" }),
  form: z.string().trim().min(1, { message: "Forma farmacéutica requerida" }),
  dose: z.string().trim().min(1, { message: "Dosis requerida" }),
  route: z.string().trim().min(1, { message: "Vía de administración requerida" }),
  frequency: z.string().trim().min(1, { message: "Frecuencia requerida" }),
  duration: z.string().trim().min(1, { message: "Duración requerida" }),
  notes: z.string().trim().optional().default(""),
  professional: professionalSchema,
});

router.post("/prescriptions", (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return res.status(400).json({ message: issue?.message || "Datos inválidos" });
  }

  const payload = parsed.data;
  const patient = patients.get(payload.patientId);
  if (!patient) {
    return res.status(404).json({ message: "Paciente no encontrado" });
  }

  const record = createPrescription({ ...payload, patient });
  return res.status(201).json(record);
});

router.get("/patients/:id/prescriptions", (req, res) => {
  const patient = patients.get(req.params.id);
  if (!patient) {
    return res.status(404).json({ message: "Paciente no encontrado" });
  }
  const items = listPrescriptionsByPatient(patient.id);
  res.json(items);
});

router.get("/prescriptions/:id", (req, res) => {
  const record = getPrescriptionById(req.params.id);
  if (!record) {
    return res.status(404).json({ message: "Prescripción no encontrada" });
  }
  res.json(record);
});

router.post("/prescriptions/:id/suspend", (req, res) => {
  const record = suspendPrescription(req.params.id);
  if (!record) {
    return res.status(404).json({ message: "Prescripción no encontrada" });
  }
  res.json(record);
});

export default router;
