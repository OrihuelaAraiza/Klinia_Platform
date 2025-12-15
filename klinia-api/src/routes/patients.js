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

async function checkPatientOwnership(patientId, professionalId) {
        if (!patientId || !professionalId) return false;

        const patient = await prisma.patientRecord.findUnique({
                where: { id: patientId, professionalInChargeId: professionalId },
                select: { id: true },
        });

        return !!patient;
}

const patientCreationPayloadSchema = z.object({
        firstName: z.string().trim().min(2),
        lastName: z.string().trim().min(2),
        curp: z.string().trim().optional(),
        birthDate: z.string().min(1),
        gender: z.string().optional(),
        phone: z.string().min(10),
        email: z.string().email().optional(), 
        referral: z.string().min(1).optional(),
        purpose: z.string().min(3).optional(), 
        emergencyName: z.string().optional(),
        emergencyPhone: z.string().optional(),
});


const importedPatientDataSchema = z.object({
        id: z.string().optional(),
        userId: z.string().optional(),
        firstName: z.string().trim().min(1),
        lastName: z.string().trim().min(1),
        curp: z.string().trim().nullable().optional(),
        birthDate: z.string().min(1),
        gender: z.string().nullable().optional(),
        referral: z.string().optional(),
        purpose: z.string().optional(),
        phone: z.string().min(10),
        emergencyName: z.string().optional(),
        emergencyPhone: z.string().optional(),
        createdAt: z.string().optional(),
        updatedAt: z.string().optional(),
        phoneIsVerified: z.boolean().optional(),
});

const importedHistoryDataSchema = z.object({
        content: z.string().nullable().optional(),
}).nullable();

const importedSessionSchema = z.object({
        id: z.string(),
        professionalId: z.string(), 
        patientId: z.string(),
        datetime: z.string(),
        durationMinutes: z.number().int(),
        modality: z.string(),
        status: z.string(),
        location: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        createdAt: z.string().optional(),
        updatedAt: z.string().optional(),
});

const importedPrescriptionSchema = z.object({
        id: z.string(),
        therapistId: z.string(), 
        patientRecordId: z.string(),
        substance: z.string(),
        form: z.string(),
        dose: z.string(),
        route: z.string(),
        frequency: z.string(),
        duration: z.string(),
        notes: z.string().nullable().optional(),
        createdAt: z.string().optional(),
        status: z.string().optional(),
});

const importPayloadSchema = z.object({
        patientData: importedPatientDataSchema,
        clinicalData: z.object({
                history: importedHistoryDataSchema,
                sessions: z.array(importedSessionSchema).optional(),
                prescriptions: z.array(importedPrescriptionSchema).optional(),
        }),
});


function normalizePatientOutput(record) {
        if (!record) return null;

        const user = record.user || {};
        const patientRecord = record;

        return {
                id: patientRecord.id,
                userId: user.id || null, 
                email: user.email || patientRecord.email || null, 
                name: user.name || `${patientRecord.firstName} ${patientRecord.lastName}`.trim(), 
                curp: patientRecord.curp,
                firstName: patientRecord.firstName,
                lastName: patientRecord.lastName,
                phone: patientRecord.phone,
                birthDate: patientRecord.birthDate,
                emergencyName: patientRecord.emergencyName,
                emergencyPhone: patientRecord.emergencyPhone,
                professionalInChargeId: patientRecord.professionalInChargeId || null,

                attachments: [],
                createdAt: patientRecord.createdAt,
                updatedAt: patientRecord.updatedAt,
        };
}


function getProfessionalId(req) {
        return req.user?.id; 
}

router.get("/", async (req, res) => {
        const professionalId = getProfessionalId(req);
        
        if (!professionalId) {
                return res.status(401).json({ message: "Acceso no autorizado." });
        }
        
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
                professionalInChargeId: professionalId, 
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


router.post("/", async (req, res) => {
        const professionalId = getProfessionalId(req);
        
        if (!professionalId) {
                return res.status(401).json({ message: "Acceso no autorizado. Debe ser un profesional." });
        }
        
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
                                        professionalInChargeId: professionalId,
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

router.get("/:id", async (req, res) => {
        const professionalId = getProfessionalId(req);
        
        if (!professionalId) {
                return res.status(401).json({ message: "Acceso no autorizado." });
        }

        try {
                const record = await prisma.patientRecord.findUnique({
                        where: { 
                                id: req.params.id,
                                professionalInChargeId: professionalId, 
                        },
                        include: { user: true },
                });

                if (!record) {
                        return res.status(404).json({ message: "Patient not found or unauthorized" });
                }

                return res.json(normalizePatientOutput(record));
        } catch (error) {
                console.error("[Patients] Detail error:", error);
                return res.status(500).json({ message: "Error al obtener paciente" });
        }
});

router.get("/:id/prescriptions", async (req, res) => {
        const professionalId = getProfessionalId(req);
        const patientRecordId = req.params.id;

        if (!professionalId) {
                return res.status(401).json({ message: "Acceso no autorizado." });
        }

        try {
                const patient = await prisma.patientRecord.findUnique({
                        where: { 
                                id: patientRecordId,
                                professionalInChargeId: professionalId, 
                        },
                });

                if (!patient) {
                        return res.status(404).json({ message: "Patient not found or unauthorized" });
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

router.get("/:id/bundle", async (req, res) => {
        const professionalId = getProfessionalId(req);
        const patientRecordId = req.params.id;

        if (!professionalId) {
                return res.status(401).json({ message: "Autenticación requerida." });
        }

        try {
                const patient = await prisma.patientRecord.findUnique({
                        where: { 
                                id: patientRecordId,
                                professionalInChargeId: professionalId, 
                        },
                        include: { user: true }
                });

                if (!patient) {
                        return res.status(404).json({ message: "Paciente no encontrado o no autorizado." });
                }
                
                const [sessions, prescriptions] = await prisma.$transaction([
                        prisma.session.findMany({ 
                                where: { patientId: patientRecordId }, 
                                orderBy: { datetime: 'asc' },
                                include: { professional: { select: { name: true, id: true } } }
                        }),
                        prisma.prescription.findMany({ 
                                where: { patientRecordId: patientRecordId },
                                orderBy: { createdAt: 'desc' },
                                include: { therapist: { select: { name: true, id: true } } }
                        }),
                ]);
                
                const normalizedPatient = normalizePatientOutput(patient);
                
                return res.json({
                        patientData: normalizedPatient,
                        clinicalData: {
                                history: { content: "Historial ensamblado (Sesiones/Prescripciones)." }, 
                                sessions: sessions,
                                prescriptions: prescriptions,
                                notes: [], 
                                consents: [], 
                        }
                });

        } catch (e) {
                console.error("[Patients] Get Bundle Error:", e);
                res.status(500).json({ message: "Error al ensamblar el historial completo." });
        }
});


router.post("/import-reassign", async (req, res) => {
        const professionalId = getProfessionalId(req);

        if (!professionalId) {
                return res.status(401).json({ message: "Acceso no autorizado para importación." });
        }

        const parsed = importPayloadSchema.safeParse(req.body);

        if (!parsed.success) {
                return res.status(400).json({
                        message: "El archivo JSON de expediente es inválido o está incompleto.",
                        details: parsed.error.errors,
                });
        }

        const { patientData, clinicalData } = parsed.data;
        const { history: historyData, sessions, prescriptions } = clinicalData;
        
        const patientId = patientData.id || uid("PAT_");
        const userId = patientData.userId || uid("U_");
        const email = patientData.email?.toLowerCase() || `${uid("G_")}_kliniaguest@example.com`;
        const fullName = `${patientData.firstName} ${patientData.lastName}`.trim();

        try {
                const importedPatient = await prisma.$transaction(async (tx) => {
                        
                        const temporaryPasswordHash = await bcrypt.hash(uid(), 8); 
                        const userRecord = await tx.user.create({
                                data: { id: userId, email, name: fullName, role: "PATIENT", passwordHash: temporaryPasswordHash },
                        });
                        
                        const patientRecordData = {
                                ...patientData,
                                id: patientId,
                                userId: userRecord.id,
                                professionalInChargeId: professionalId, 
                                createdAt: patientData.createdAt ? new Date(patientData.createdAt) : undefined,
                                updatedAt: new Date(),
                        };
                        delete patientRecordData.email; 

                        const record = await tx.patientRecord.create({
                                data: patientRecordData,
                                include: { user: true }
                        });

                        if (historyData?.content) { 
                                await tx.history.create({
                                        data: {
                                                patientId: record.id, 
                                                professionalId: professionalId, 
                                                content: historyData.content, 
                                        },
                                });
                        }

                        if (sessions && sessions.length > 0) {
                                const sessionCreations = sessions.map(session => tx.session.create({
                                        data: {
                                                ...session,
                                                id: uid("SES_"), 
                                                patientId: record.id, 
                                                professionalId: professionalId, 
                                                createdAt: new Date(session.createdAt || undefined),
                                                updatedAt: new Date(session.updatedAt || undefined),
                                        }
                                }));
                                await Promise.all(sessionCreations);
                        }

                        if (prescriptions && prescriptions.length > 0) {
                                const prescriptionCreations = prescriptions.map(prescription => tx.prescription.create({
                                        data: {
                                                ...prescription,
                                                id: uid("PRES_"), 
                                                patientRecordId: record.id, 
                                                therapistId: professionalId, 
                                                createdAt: new Date(prescription.createdAt || undefined),
                                                status: prescription.status || 'VIGENTE',
                                        }
                                }));
                                await Promise.all(prescriptionCreations);
                        }
                        
                        return record;
                });


                return res.status(201).json(normalizePatientOutput(importedPatient));

        } catch (e) {
                console.error("[Patients] Import & Reassign Error:", e);
                if (e.code === 'P2002' || e.code === 'P2003') { 
                           return res.status(409).json({ message: "Error al guardar el expediente: el CURP, ID o Email ya están registrados." });
                }
                return res.status(500).json({ message: "Error al guardar el expediente: Datos duplicados o inválidos." });
        }
});


router.put("/:id", async (req, res) => {
        const professionalId = getProfessionalId(req);
        const patientRecordId = req.params.id;
        
        if (!professionalId) {
                return res.status(401).json({ message: "Acceso no autorizado." });
        }
        
        const parsed = patientUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
                return res.status(400).json({
                        message: parsed.error.issues[0]?.message || "Datos inválidos",
                });
        }

        const updates = parsed.data;

        try {
                const existing = await prisma.patientRecord.findUnique({
                        where: { 
                                id: patientRecordId,
                                professionalInChargeId: professionalId, 
                        },
                        include: { user: true },
                });

                if (!existing) {
                        return res.status(404).json({ message: "Patient not found or unauthorized" });
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



router.get("/:patientId/reports", async (req, res) => {
        const { patientId } = req.params;
        const professionalId = getProfessionalId(req);

        if (!professionalId) {
                return res.status(401).json({ message: "Autenticación requerida." });
        }

        const isOwner = await checkPatientOwnership(patientId, professionalId);
        if (!isOwner) {
                return res.status(403).json({ message: "No tienes permiso para ver los reportes de este paciente." });
        }

        try {
                const reports = await prisma.report.findMany({
                        where: {
                                patientId: patientId,
                        },
                        orderBy: { createdAt: 'desc' },
                });

                return res.json(reports);

        } catch (e) {
                console.error("[Patients] List Reports DB Error:", e);
                return res.status(500).json({ message: "Error al listar reportes." });
        }
});

router.get("/:patientId/orders", async (req, res) => {
    const { patientId } = req.params;
    const professionalId = getProfessionalId(req);

    if (!professionalId) {
        return res.status(401).json({ message: "Autenticación requerida." });
    }

    const isOwner = await checkPatientOwnership(patientId, professionalId);
    if (!isOwner) {
        return res.status(403).json({ message: "No tienes permiso para ver las órdenes de este paciente." });
    }

    try {
        const orders = await prisma.order.findMany({
            where: { patientId: patientId },
            orderBy: { createdAt: 'desc' },
        });

        return res.json(orders);

    } catch (e) {
        // Este catch maneja errores de DB, como si la tabla 'order' no existiera (Migration pendiente)
        console.error("[Patients] List Orders DB Error:", e);
        return res.status(500).json({ message: "Error al listar órdenes." });
    }
});


export default router;