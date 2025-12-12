import { Router } from "express";
import { z } from "zod";
import { prisma } from "../services/dbClient.js";
import { uid } from "../store/memory.js";

const router = Router();

function getTherapistId(req) {
    return req.user?.id; 
}

async function logAuditAction(therapistId, action, targetId, metadata = {}) {
    if (!therapistId) return; 

    try {
        await prisma.auditLog.create({
            data: {
                action: `PRESCRIPTION_${action}`, 
                therapistId: therapistId,
                targetId: targetId, 
                metadata: metadata,
            }
        });
    } catch (e) {
        console.error(`[AuditLog] Failed to log ${action} for ${targetId}:`, e);
    }
}


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


router.post("/", async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
        const issue = parsed.error.issues[0];
        return res.status(400).json({ message: issue?.message || "Datos inválidos" });
    }

    const payload = parsed.data;
    const therapistId = getTherapistId(req);

    if (!therapistId) {
        return res.status(401).json({ message: "Se requiere autenticación para emitir prescripciones." });
    }

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
                folio: uid("F-"), 
                
                therapistId, 
                patientRecordId: payload.patientRecordId,
                
                substance: payload.substance,
                form: payload.form,
                dose: payload.dose,
                route: payload.route,
                frequency: payload.frequency,
                duration: payload.duration,
                notes: payload.notes,
            },
        });
        
        await logAuditAction(therapistId, "CREATE", record.id, {
            patientRecordId: payload.patientRecordId,
            folio: record.folio,
            substance: payload.substance,
        });

        return res.status(201).json(record);
    } catch (e) {
        if (e.code === 'P2003') {
            console.error("[Prescriptions] Key Constraint Fail: Therapist ID is invalid/missing.");
            return res.status(404).json({ message: "El ID del terapeuta no fue encontrado en el sistema." });
        }

        console.error("[Prescriptions] Create DB Error:", e);
        return res.status(500).json({ message: "Error al crear la prescripción." });
    }
});


router.get("/:id", async (req, res) => {
    const id = req.params.id;
    const currentTherapistId = getTherapistId(req);

    if (!currentTherapistId) {
        return res.status(401).json({ message: "Se requiere autenticación para ver prescripciones." });
    }

    try {
        const record = await prisma.prescription.findUnique({
            where: { 
                id,
                therapistId: currentTherapistId,
            },
            include: {
                therapist: {
                    include: {
                        kycRecord: {
                            select: {
                                certificateFolio: true,
                            }
                        }
                    }
                }, 
                patientRecord: true,
            },
        });

        if (!record) {
            return res.status(404).json({ message: "Prescripción no encontrada o sin permisos para acceder." });
        }
        await logAuditAction(currentTherapistId, "VIEW", record.id, {
            folio: record.folio,
            patientRecordId: record.patientRecordId,
        });
        
        return res.json(record);
    } catch (e) {
        console.error("[Prescriptions] Detail DB Error:", e);
        return res.status(500).json({ message: "Error al obtener el detalle de la prescripción." });
    }
});


router.post("/:id/suspend", async (req, res) => {
    const id = req.params.id;
    const currentTherapistId = getTherapistId(req);

    if (!currentTherapistId) {
        return res.status(401).json({ message: "Se requiere autenticación para suspender prescripciones." });
    }

    try {
        const record = await prisma.prescription.update({
            where: { 
                id,
                therapistId: currentTherapistId, 
            },
            data: {
                status: "SUSPENDIDA",
            },
        });
        
        await logAuditAction(currentTherapistId, "SUSPEND", record.id, {
            folio: record.folio,
            oldStatus: "VIGENTE", 
            newStatus: "SUSPENDIDA",
        });

        const updatedRecord = await prisma.prescription.findUnique({
             where: { id },
             include: {
                therapist: {
                    include: {
                        kycRecord: {
                            select: {
                                certificateFolio: true,
                            }
                        }
                    }
                }, 
                patientRecord: true,
            },
        });

        return res.json(updatedRecord);
    } catch (e) {
        if (e.code === 'P2025') {
            return res.status(404).json({ message: "Prescripción no encontrada o no tienes permisos para suspenderla." });
        }
        console.error("[Prescriptions] Suspend DB Error:", e);
        return res.status(500).json({ message: "Error al suspender la prescripción." });
    }
});

export default router;