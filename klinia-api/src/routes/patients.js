import { Router } from "express";
import { z } from "zod";
import { prisma } from '../services/dbClient.js';
import { uid, pushAuditEvent } from "../store/memory.js";
import bcrypt from "bcryptjs"; 
import {
    patientUpdateSchema,
} from "../validators/patientSchemas.js"; 

const router = Router();

const querySchema = z.object({
    q: z.string().optional().default(""),
    page: z.coerce.number().int().positive().default(1),
    size: z.coerce.number().int().positive().max(100).default(10),
});

const patientCreationPayloadSchema = z.object({
    firstName: z.string().trim().min(2),
    lastName: z.string().trim().min(2),
    curp: z.string().trim().optional(),
    birthDate: z.string().min(1),
    gender: z.string().optional(),
    phone: z.string().min(10),
    email: z.string().email().optional(), 
    referral: z.string().min(1).optional(),
    purpose: z.string().min(3).optional(), // Asumiendo min(3) de la corrección anterior
    emergencyName: z.string().optional(),
    emergencyPhone: z.string().optional(),
});


function normalizePatientOutput(record) {
    if (!record) return null;

    // Asegurar que record.user exista, ya que siempre lo incluimos
    const user = record.user || {};
    const patientRecord = record;

    return {
        id: patientRecord.id,
        userId: user.id || null, 
        // Asumo que patientRecord.email podría existir si no hay relación user, pero es mejor usar user.email
        email: user.email || patientRecord.email || null, 
        name: user.name || `${patientRecord.firstName} ${patientRecord.lastName}`.trim(), 
        curp: patientRecord.curp,
        firstName: patientRecord.firstName,
        lastName: patientRecord.lastName,
        phone: patientRecord.phone,
        birthDate: patientRecord.birthDate,
        emergencyName: patientRecord.emergencyName,
        emergencyPhone: patientRecord.emergencyPhone,
        // Incluir el ID del terapeuta a cargo en la salida si existe
        professionalInChargeId: patientRecord.professionalInChargeId || null,

        attachments: [],
        createdAt: patientRecord.createdAt,
        updatedAt: patientRecord.updatedAt,
    };
}


// --- FUNCIONES DE FILTRO ---

// ID de Fallback para Desarrollo si req.user no está presente
const FALLBACK_PROFESSIONAL_ID = "U_ADMIN_TEST_FALLBACK"; 
// NOTA: Este ID debe ser un registro existente en tu tabla User para evitar P2003.

function getProfessionalId(req) {
    // 🚨 CORRECCIÓN DEL TYPERROR: Usar optional chaining y fallback
    const id = req.user?.id || FALLBACK_PROFESSIONAL_ID; 
    
    // Si la autenticación es requerida y no hay un fallback válido, lanzar error
    if (!id || id === FALLBACK_PROFESSIONAL_ID) {
        // En producción, esto debería ser 401 si req.user es null
        // Aquí lo dejamos pasar para el desarrollo asumiendo que U_ADMIN_TEST_FALLBACK existe
        console.warn("[AUTH] Using fallback professional ID:", id);
    }
    return id;
}

// ---------------------------------------------
// 1. GET / (Obtener Lista y Buscar)
// ---------------------------------------------
router.get("/", async (req, res) => {
    // 🚨 IMPLEMENTACIÓN 1: Restringir por terapeuta a cargo
    const professionalId = getProfessionalId(req);
    
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0]?.message || "Parámetros inválidos" });
    }

    const { q, page, size } = parsed.data;
    const search = q.toLowerCase();
    const skip = (page - 1) * size;

    const searchFilter = search
        ? {
            OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
                { curp: { contains: search, mode: "insensitive" } },
                { user: { email: { contains: search, mode: "insensitive" } } },
            ],
        }
        : {};

    const whereClause = {
        ...searchFilter,
        professionalInChargeId: professionalId, // ⬅️ FILTRO DE ASIGNACIÓN EXCLUSIVA
    };

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


// ---------------------------------------------
// 2. POST / (Crear Nuevo Paciente desde Terapeuta)
// ---------------------------------------------
router.post("/", async (req, res) => {
    // 🚨 IMPLEMENTACIÓN 2: Asignar al terapeuta que lo crea
    const professionalId = getProfessionalId(req);
    
    const parsed = patientCreationPayloadSchema.safeParse(req.body);
    
    if (!parsed.success) {
        return res.status(400).json({ 
            message: "Error de validación: Faltan datos esenciales del paciente.",
            details: parsed.error.errors 
        });
    }
    const payload = parsed.data;

    const email = payload.email?.toLowerCase() || `${uid("G_")}_kliniaguest@example.com`;
    const userId = uid("U_");
    const fullName = `${payload.firstName} ${payload.lastName}`.trim();

    try {
        if (!email.includes("kliniaguest")) {
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                return res.status(409).json({ message: "El correo electrónico ya está registrado." });
            }
        }
        
        const newPatient = await prisma.$transaction(async (tx) => {
            
            const temporaryPasswordHash = await bcrypt.hash(uid(), 8); 

            const user = await tx.user.create({
                data: {
                    id: userId,
                    email,
                    name: fullName,
                    role: "PATIENT",
                    passwordHash: temporaryPasswordHash, 
                    createdAt: new Date().toISOString(),
                }
            });

            const record = await tx.patientRecord.create({
                data: {
                    userId: user.id,
                    professionalInChargeId: professionalId, // ⬅️ ASIGNACIÓN AQUÍ
                    firstName: payload.firstName,
                    lastName: payload.lastName,
                    curp: payload.curp || null,
                    birthDate: payload.birthDate,
                    gender: payload.gender || null,
                    referral: payload.referral || 'No especificado',
                    purpose: payload.purpose || 'No especificado',
                    phone: payload.phone,
                    emergencyName: payload.emergencyName || '',
                    emergencyPhone: payload.emergencyPhone || '',
                    phoneIsVerified: false, 
                },
                include: { user: true }
            });
            return record;
        });

        pushAuditEvent({ event: "patient_create", meta: { id: newPatient.id }, at: new Date() });
        return res.status(201).json(normalizePatientOutput(newPatient));

    } catch (error) {
        if (error.code === 'P2002') {
             return res.status(409).json({ message: "El correo electrónico o CURP ya están registrados." });
        }
        console.error("[Patients] Create DB Error:", error);
        return res.status(500).json({ message: "Error al registrar el paciente." });
    }
});


// ---------------------------------------------
// 3. GET /:id (Obtener Detalle)
// ---------------------------------------------
router.get("/:id", async (req, res) => {
    // 🚨 IMPLEMENTACIÓN 3: Restringir por terapeuta a cargo
    const professionalId = getProfessionalId(req);
    
    try {
        const record = await prisma.patientRecord.findUnique({
            where: { 
                id: req.params.id,
                professionalInChargeId: professionalId, // ⬅️ FILTRO DE PROPIEDAD
            },
            include: { user: true },
        });

        if (!record) {
            // Devuelve 404 si no existe o si no le pertenece a este terapeuta
            return res.status(404).json({ message: "Patient not found" });
        }

        return res.json(normalizePatientOutput(record));
    } catch (error) {
        console.error("[Patients] Detail error:", error);
        return res.status(500).json({ message: "Error al obtener paciente" });
    }
});


// ---------------------------------------------
// 3.1. GET /:id/prescriptions (Listar Recetas del Paciente)
// ---------------------------------------------
router.get("/:id/prescriptions", async (req, res) => {
    // 🚨 IMPLEMENTACIÓN 4: Restringir por terapeuta a cargo
    const professionalId = getProfessionalId(req);
    const patientRecordId = req.params.id;

    try {
        // Validación de propiedad: Chequear que el paciente pertenezca al profesional
        const patient = await prisma.patientRecord.findUnique({
            where: { 
                id: patientRecordId,
                professionalInChargeId: professionalId, // ⬅️ FILTRO DE PROPIEDAD
            },
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


// ---------------------------------------------
// 4. PUT /:id (Actualizar Paciente)
// ---------------------------------------------
router.put("/:id", async (req, res) => {
    // 🚨 IMPLEMENTACIÓN 5: Restringir por terapeuta a cargo
    const professionalId = getProfessionalId(req);
    const patientRecordId = req.params.id;
    
    const parsed = patientUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            message: parsed.error.issues[0]?.message || "Datos inválidos",
        });
    }

    const updates = parsed.data;

    try {
        // Validación de propiedad
        const existing = await prisma.patientRecord.findUnique({
            where: { 
                id: patientRecordId,
                professionalInChargeId: professionalId, // ⬅️ FILTRO DE PROPIEDAD
            },
            include: { user: true },
        });

        if (!existing) {
            return res.status(404).json({ message: "Patient not found" });
        }
        
        // Lógica de validación de email duplicado (Mantenida)
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
        
        // Lógica de la transacción (Mantenida)
        const updatedRecords = await prisma.$transaction(async (tx) => {

            if (Object.keys(userData).length > 0) {
                await tx.user.update({
                    where: { id: existing.userId },
                    data: userData,
                });
            }

            // Aquí se actualiza el registro, se asume que el professionalInChargeId no cambia
            const updatedPatientRecord = await tx.patientRecord.update({
                where: { 
                    id: patientRecordId,
                    professionalInChargeId: professionalId, 
                },
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