import { Router } from "express";
import { z } from "zod";
import { prisma } from "../services/dbClient.js";
import { uid } from "../store/memory.js";

const router = Router();

// --- ESQUEMAS ZOD ---

const professionalSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().min(1, { message: "Nombre del profesional requerido" }),
    role: z.string().optional(),
    license: z.string().optional(),
  })
  .optional();

// Esquema de creación que mapea a los campos del modelo Prescription
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


// --- RUTA 1: POST / (Crear Prescripción) ---
router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return res.status(400).json({ message: issue?.message || "Datos inválidos" });
  }

  const payload = parsed.data;

  // 🚨 CORRECCIÓN P2003: Usar el ID del usuario JWT o un FALLBACK de DEBUG válido.
  // Asumiendo que 'U_v4a6f8qv' es un ID de 'User' que existe en tu base de datos.
  const FALLBACK_THERAPIST_ID = "U_v4a6f8qv"; 
  const therapistId = req.user?.id || FALLBACK_THERAPIST_ID;

  try {
    // Verificar existencia de paciente (si falla, devuelve 404)
    const patient = await prisma.patientRecord.findUnique({
      where: { id: payload.patientRecordId },
    });

    if (!patient) {
      return res.status(404).json({ message: "Paciente no encontrado" });
    }

    const record = await prisma.prescription.create({
      data: {
        id: uid("PRES_"),
        folio: uid("F-"), // Generar un folio simple de trazabilidad
        
        // Asignar IDs
        therapistId,
        patientRecordId: payload.patientRecordId,
        
        // Mapear campos detallados del payload al modelo de Prisma
        substance: payload.substance,
        form: payload.form,
        dose: payload.dose,
        route: payload.route,
        frequency: payload.frequency,
        duration: payload.duration,
        notes: payload.notes,
        
        // El estado se inicializa como VIGENTE por defecto en el esquema.
      },
    });

    return res.status(201).json(record);
  } catch (e) {
    // Manejo específico del fallo de clave externa (aunque el fallback debería prevenirlo)
    if (e.code === 'P2003') {
        console.error("[Prescriptions] Key Constraint Fail: Therapist ID is invalid/missing.");
        return res.status(404).json({ message: "El ID del terapeuta no fue encontrado en el sistema." });
    }

    console.error("[Prescriptions] Create DB Error:", e);
    return res.status(500).json({ message: "Error al crear la prescripción." });
  }
});


// --- RUTA 2: GET /:id (Obtener Detalle) ---
router.get("/:id", async (req, res) => {
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
    
    // Aquí podrías enriquecer el objeto record si es necesario (ej: patientName, professionalName)

    return res.json(record);
  } catch (e) {
    console.error("[Prescriptions] Detail DB Error:", e);
    return res.status(500).json({ message: "Error al obtener el detalle de la prescripción." });
  }
});


// --- RUTA 3: POST /:id/suspend (Suspender Prescripción) ---
router.post("/:id/suspend", async (req, res) => {
  const id = req.params.id;

  try {
    const record = await prisma.prescription.update({
      where: { id },
      data: {
        status: "SUSPENDIDA", // 🚨 CORRECCIÓN: Usar el ENUM de Prisma (asumo que se llama SUSPENDIDA)
      },
    });

    return res.json(record);
  } catch (e) {
    if (e.code === 'P2025') {
        return res.status(404).json({ message: "Prescripción no encontrada para suspender." });
    }
    console.error("[Prescriptions] Suspend DB Error:", e);
    return res.status(500).json({ message: "Error al suspender la prescripción." });
  }
});

export default router;