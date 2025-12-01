import { Router } from "express";
import { z } from "zod";
import { uid, pushAuditEvent } from "../store/memory.js";
import { prisma } from "../services/dbClient.js"; // Cliente Prisma

// Asumo que estos esquemas existen y están correctamente definidos
import {
    patientUpdateSchema,
} from "../validators/patientSchemas.js";

const querySchema = z.object({
    q: z.string().optional().default(""),
    page: z.coerce.number().int().positive().default(1),
    size: z.coerce.number().int().positive().max(100).default(10),
});

const router = Router();

// --- HELPERS (Normalización de datos para salida) ---

function normalizePatientOutput(record) {
    if (!record) return null;

    // Combina datos de User y PatientRecord
    const { user, ...patientRecord } = record;

    return {
        id: patientRecord.id,
        userId: user.id,

        // Datos del Usuario
        email: user.email,
        name: user.name,

        // Datos de PatientRecord (Directos de la tabla)
        curp: patientRecord.curp,
        firstName: patientRecord.firstName,
        lastName: patientRecord.lastName,
        phone: patientRecord.phone,
        birthDate: patientRecord.birthDate,
        emergencyName: patientRecord.emergencyName,
        emergencyPhone: patientRecord.emergencyPhone,

        attachments: [],
        createdAt: patientRecord.createdAt,
        updatedAt: patientRecord.updatedAt,
    };
}
// --- FIN HELPERS ---


// --- 1. GET / (Obtener Lista y Buscar) ---
router.get("/", async (req, res) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0]?.message || "Parámetros inválidos" });
    }

    const { q, page, size } = parsed.data;
    const search = q.toLowerCase();
    const skip = (page - 1) * size;

    // Cláusula WHERE (Búsqueda unificada en PatientRecord y User)
    const whereClause = search
        ? {
            OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
                { curp: { contains: search, mode: "insensitive" } },
                { user: { email: { contains: search, mode: "insensitive" } } },
            ],
        }
        : {};

    console.log("[DEBUG] Searching Patients with:", JSON.stringify(whereClause));
    try {
        const total = await prisma.patientRecord.count({ where: whereClause });

        const records = await prisma.patientRecord.findMany({
            where: whereClause,
            include: { user: true },
            skip,
            take: size,
            orderBy: { createdAt: "desc" },
        });

        return res.json({
            items: records.map(normalizePatientOutput),
            page,
            size,
            total,
        });
    } catch (error) {
        console.error("[Patients] List error:", error);
        return res.status(500).json({ message: "Error al consultar pacientes" });
    }
});

// --- 2. POST / (Crear Nuevo Paciente - Mantenido como obsoleto) ---
router.post("/", async (req, res) => {
    return res.status(501).json({ message: "Use /auth/register/patient para crear pacientes." });
});

// --- 3. GET /:id (Obtener Detalle) ---
router.get("/:id", async (req, res) => {
    try {
        const record = await prisma.patientRecord.findUnique({
            where: { id: req.params.id },
            include: { user: true },
        });

        if (!record) {
            return res.status(404).json({ message: "Patient not found" });
        }

        return res.json(normalizePatientOutput(record));
    } catch (error) {
        console.error("[Patients] Detail error:", error);
        return res.status(500).json({ message: "Error al obtener paciente" });
    }
});

// --- 3.1. GET /:id/prescriptions (Listar Recetas del Paciente) ---
router.get("/:id/prescriptions", async (req, res) => {
    const patientRecordId = req.params.id;

    try {
        const patient = await prisma.patientRecord.findUnique({
            where: { id: patientRecordId },
        });

        if (!patient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        const items = await prisma.prescription.findMany({
            where: { patientRecordId },
            orderBy: { createdAt: "desc" },
        });

        res.json(items);
    } catch (e) {
        console.error("[Patients] Prescriptions List Error:", e);
        res.status(500).json({ message: "Error al consultar las prescripciones." });
    }
});

// --- 4. PUT /:id (Actualizar Paciente) ---
router.put("/:id", async (req, res) => {
    const patientRecordId = req.params.id;
    const parsed = patientUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            message: parsed.error.issues[0]?.message || "Datos inválidos",
        });
    }

    const updates = parsed.data;

    try {
        const existing = await prisma.patientRecord.findUnique({
            where: { id: patientRecordId },
            include: { user: true },
        });

        if (!existing) {
            return res.status(404).json({ message: "Patient not found" });
        }

        if (updates.email) {
            const duplicateEmail = await prisma.user.findFirst({
                where: {
                    email: updates.email.toLowerCase(),
                    NOT: { id: existing.userId },
                },
            });

            if (duplicateEmail) {
                return res.status(409).json({ message: "Email ya registrado" });
            }
        }

        const userData = {};
        const patientRecordData = {};

        if (updates.email !== undefined) {
            userData.email = updates.email.toLowerCase();
        }

        if (updates.firstName !== undefined || updates.lastName !== undefined) {
            const newFirstName = updates.firstName ?? existing.firstName;
            const newLastName = updates.lastName ?? existing.lastName;
            userData.name = `${newFirstName} ${newLastName}`.trim();
            patientRecordData.firstName = newFirstName;
            patientRecordData.lastName = newLastName;
        }

        if (updates.curp !== undefined) patientRecordData.curp = updates.curp.toUpperCase();
        if (updates.birthDate !== undefined) patientRecordData.birthDate = updates.birthDate;
        if (updates.phone !== undefined) patientRecordData.phone = updates.phone;
        if (updates.emergencyName !== undefined) patientRecordData.emergencyName = updates.emergencyName;
        if (updates.emergencyPhone !== undefined) patientRecordData.emergencyPhone = updates.emergencyPhone;
        if (updates.gender !== undefined) patientRecordData.gender = updates.gender;

        const updatedRecords = await prisma.$transaction(async (tx) => {

            if (Object.keys(userData).length > 0) {
                await tx.user.update({
                    where: { id: existing.userId },
                    data: userData,
                });
            }

            const updatedPatientRecord = await tx.patientRecord.update({
                where: { id: patientRecordId },
                data: patientRecordData,
                include: { user: true }
            });

            return updatedPatientRecord;
        });

        pushAuditEvent({ event: "patient_update", meta: { id: existing.id }, at: updatedRecords.updatedAt });

        return res.json(normalizePatientOutput(updatedRecords));
    } catch (error) {
        console.error("[Patients] Update error:", error);
        return res.status(500).json({ message: "Error al actualizar paciente" });
    }
});

export default router;