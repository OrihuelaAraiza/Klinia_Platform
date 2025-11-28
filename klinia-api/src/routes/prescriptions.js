import { Router } from "express";
import { z } from "zod";
import { prisma } from "../services/dbClient.js";
import { uid } from "../store/memory.js"; 

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
  patientRecordId: z.string().trim().min(1, { message: "ID del paciente requerido" }),
  substance: z.string().trim().min(1, { message: "Principio activo requerido" }),
  form: z.string().trim().min(1, { message: "Forma farmacéutica requerida" }),
  dose: z.string().trim().min(1, { message: "Dosis requerida" }),
  route: z.string().trim().min(1, { message: "Vía de administración requerida" }),
  frequency: z.string().trim().min(1, { message: "Frecuencia requerida" }),
  duration: z.string().trim().min(1, { message: "Duración requerida" }),
  notes: z.string().trim().optional().default(""),
  professional: professionalSchema,
});


router.post("/prescriptions", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return res.status(400).json({ message: issue?.message || "Datos inválidos" });
  }

  const payload = parsed.data;

  const therapistId = req.user?.id || "U_ADMIN_TEST"; 

  try {
    const patient = await prisma.patientRecord.findUnique({
      where: { id: payload.patientRecordId },
    });

    if (!patient) {
      return res.status(404).json({ message: "Paciente no encontrado" });
    }

    const record = await prisma.prescription.create({
      data: {
        id: uid("PRES_"),
        description: `${payload.substance} (${payload.dose})`,

        therapistId,
        patientRecordId: payload.patientRecordId,

      },
    });

    return res.status(201).json(record);
  } catch (e) {
    console.error("[Prescriptions] Create DB Error:", e);
    res.status(500).json({ message: "Error al crear la prescripción." });
  }
});


router.get("/patients/:id/prescriptions", async (req, res) => {
  const patientRecordId = req.params.id;

  try {
    const patient = await prisma.patientRecord.findUnique({
      where: { id: patientRecordId },
    });

    if (!patient) {
      return res.status(404).json({ message: "Paciente no encontrado" });
    }

    const items = await prisma.prescription.findMany({
      where: { patientRecordId },
      orderBy: { createdAt: "desc" },
    });

    res.json(items);
  } catch (e) {
    console.error("[Prescriptions] List DB Error:", e);
    res.status(500).json({ message: "Error al consultar las prescripciones." });
  }
});


router.get("/prescriptions/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const record = await prisma.prescription.findUnique({
      where: { id },
      include: {
        therapist: true,
        patientRecord: true,
      },
    });

    if (!record) {
      return res.status(404).json({ message: "Prescripción no encontrada" });
    }

    res.json(record);
  } catch (e) {
    console.error("[Prescriptions] Detail DB Error:", e);
    res.status(500).json({ message: "Error al obtener el detalle de la prescripción." });
  }
});


router.post("/prescriptions/:id/suspend", async (req, res) => {
  const id = req.params.id;

  try {
    const record = await prisma.prescription.update({
      where: { id },
      data: {
        status: "suspendida",
      },
    });

    res.json(record);
  } catch (e) {
    console.error("[Prescriptions] Suspend DB Error:", e);
    res.status(500).json({ message: "Error al suspender la prescripción." });
  }
});

export default router;
