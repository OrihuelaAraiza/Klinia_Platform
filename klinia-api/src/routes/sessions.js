import { Router } from "express";
import { z } from "zod";
import { prisma } from "../services/dbClient.js";
import { pushAuditEvent } from "../store/memory.js";
import {
    sessionCreateSchema,
    sessionUpdateSchema,
    sessionStatusSchema,
    sessionLinkNoteSchema,
} from "../validators/sessionSchemas.js";


export const SESSION_STATUS = {
    PROGRAMADA: "SCHEDULED",
    CONFIRMADA: "CONFIRMED",
    ATENDIDA: "COMPLETED",
    NO_PRESENTADA: "NO_SHOW",
    CANCELADA: "CANCELLED",
};

const querySchema = z.object({
    q: z.string().optional().default(""),
    from: z.string().optional(),
    to: z.string().optional(),
    status: z.nativeEnum(SESSION_STATUS).optional(),
    professionalId: z.string().optional(), 
    page: z.coerce.number().int().positive().default(1),
    size: z.coerce.number().int().positive().max(100).default(10),
});

const router = Router();

const FALLBACK_PROFESSIONAL_ID = "U_ADMIN_TEST_FALLBACK"; 

function getProfessionalId(req) {
    const id = req.user?.id || FALLBACK_PROFESSIONAL_ID; 
    
    if (id === FALLBACK_PROFESSIONAL_ID) {
        console.warn("[AUTH] Using fallback professional ID for sessions.");
    }
    return id;
}

function mapStatusToPrisma(status) {
    switch (status.toLowerCase()) {
        case "programada": return "SCHEDULED";
        case "confirmada": return "CONFIRMED";
        case "atendida": return "COMPLETED";
        case "no_presentada": return "NO_SHOW";
        case "cancelada": return "CANCELLED";
        default: return undefined;
    }
}

function parseDateParam(value, { endOfDay = false } = {}) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    if (endOfDay && typeof value === "string" && !value.includes("T")) {
        date.setHours(23, 59, 59, 999);
    }

    return date;
}

function normalizeSessionOutput(session) {
    if (!session) return null;
    
    const { patient, professional, ...sessionData } = session;

    return {
        ...sessionData,
        patientFirstName: patient?.firstName || null,
        patientLastName: patient?.lastName || null,
        patientCurp: patient?.curp || null,
        
        professionalName: professional?.name || null,
        professionalEmail: professional?.email || null,
    };
}

router.post("/", async (req, res) => {
    const rawPayload = req.body;
    const professionalId = getProfessionalId(req);

    if (rawPayload.durationMin !== undefined) {
        rawPayload.durationMinutes = rawPayload.durationMin;
        delete rawPayload.durationMin;
    }

    const parsed = sessionCreateSchema.safeParse(rawPayload);

    if (!parsed.success) {
        return res.status(400).json({
            message: "Error de validación de datos de la sesión.",
            details: parsed.error.errors,
        });
    }

    const data = parsed.data; 

    try {
        const patient = await prisma.patientRecord.findUnique({ where: { id: data.patientId } }); 
        if (!patient) return res.status(404).json({ message: "Paciente no encontrado." });
        
        const professional = await prisma.user.findUnique({ where: { id: professionalId } });
        if (!professional) return res.status(404).json({ message: "Profesional no encontrado o ID inválido." }); 

        const newSession = await prisma.session.create({
            data: {
                professionalId: professionalId, 
                patientId: data.patientId,
                datetime: new Date(data.datetime),
                durationMinutes: data.durationMinutes,
                modality: data.modality,
                status: data.status,
                location: rawPayload.location || null,
                notes: rawPayload.notes || null,
            },
            include: {
                patient: { select: { id: true, firstName: true, lastName: true, curp: true } },
                professional: { select: { id: true, name: true, email: true } },
            },
        });

        pushAuditEvent({
            event: "session_created",
            meta: { id: newSession.id, professionalId: newSession.professionalId },
            at: new Date().toISOString(),
        });

        return res.status(201).json(normalizeSessionOutput(newSession));

    } catch (error) {
        console.error("[Sessions] Creation error:", error);
        return res.status(500).json({ message: "Error al agendar la sesión." });
    }
});

router.get("/", async (req, res) => {
    const professionalId = getProfessionalId(req);
    
    const parsed = querySchema.safeParse(req.query);

    if (!parsed.success) {
        return res.status(400).json({
            message: parsed.error.issues[0]?.message || "Parámetros inválidos",
            details: parsed.error.errors, 
        });
    }

    const { q, from, to, status, page, size } = parsed.data;
    const skip = (page - 1) * size;

    const fromDate = parseDateParam(from);
    const toDate = parseDateParam(to); 

    let prismaStatus = status;

if (prismaStatus === 'CONFIRMED' && !['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].includes('CONFIRMED')) {
    prismaStatus = 'SCHEDULED';
}
    
    let where = {
        professionalId: professionalId, 
        datetime: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
        },
        ...(prismaStatus ? { status: prismaStatus } : {}),
    };

    if (q) {
        where = {
            ...where,
            OR: [
                { patientId: { contains: q, mode: "insensitive" } },
            ],
        };
    }

    try {
        const [total, records] = await prisma.$transaction([
            prisma.session.count({ where }),
            prisma.session.findMany({
                where,
                include: {
                    patient: { select: { id: true, firstName: true, lastName: true, curp: true } },
                    professional: { select: { id: true, name: true, email: true } },
                },
                orderBy: { datetime: "desc" },
                skip,
                take: size,
            }),
        ]);

        const normalizedRecords = records.map(normalizeSessionOutput);

        return res.json({ items: normalizedRecords, total, page, size });

    } catch (error) {
        console.error("[Sessions] Consulta DB Error:", error);
        return res.status(500).json({ message: "Error al consultar sesiones." });
    }
});


// 3. GET /:id (Obtener Detalle o ICS)
router.get("/:id", async (req, res) => {
    const sessionId = req.params.id;
    const professionalId = getProfessionalId(req); 
    
    if (req.query.export === 'ics') {
        try {
            const session = await prisma.session.findUnique({
                where: { id: sessionId, professionalId: professionalId },
                include: {
                    patient: { select: { firstName: true, lastName: true } },
                    professional: { select: { name: true } },
                },
            });

            if (!session) {
                return res.status(404).json({ message: "Sesión no encontrada o sin permisos." });
            }

            const dateStart = new Date(session.datetime);
            const dateEnd = new Date(dateStart.getTime() + session.durationMinutes * 60000);
            const patientName = `${session.patient.firstName} ${session.patient.lastName}`;
            const professionalName = session.professional.name;

            const icsContent = [
                "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Klinia Platform//Session Export//ES", "BEGIN:VEVENT",
                `UID:${session.id}@klinia.app`,
                `DTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d{3}/g, '').replace('Z', '')}`,
                `DTSTART:${dateStart.toISOString().replace(/[-:]|\.\d{3}/g, '').replace('Z', '')}`,
                `DTEND:${dateEnd.toISOString().replace(/[-:]|\.\d{3}/g, '').replace('Z', '')}`,
                `SUMMARY:Cita: ${patientName} con ${professionalName}`,
                `LOCATION:${session.location || 'Consultorio Virtual'}`,
                "END:VEVENT", "END:VCALENDAR"
            ].join('\r\n');

            res.setHeader('Content-Type', 'text/calendar');
            res.setHeader('Content-Disposition', `attachment; filename=sesion-${sessionId}.ics`);
            return res.send(icsContent);

        } catch (error) {
            console.error("[Sessions] ICS Export Error (in GET /:id):", error);
            return res.status(500).json({ message: "Error al generar el archivo de calendario." });
        }
    }
    
    // CONTINUACIÓN DE LA RUTA GET /:id NORMAL
    try {
        const record = await prisma.session.findUnique({
            where: { 
                id: sessionId,
                professionalId: professionalId, 
            },
            include: {
                patient: { select: { id: true, firstName: true, lastName: true, curp: true } },
                professional: { select: { id: true, name: true, email: true } },
            },
        });

        if (!record) {
            return res.status(404).json({ message: "Sesión no encontrada o sin permisos." });
        }
        
        return res.json(normalizeSessionOutput(record)); 

    } catch (error) {
        console.error("[Sessions] Detail DB Error:", error);
        return res.status(500).json({ message: "Error al obtener el detalle de la sesión." });
    }
});


// 5. PUT /:id (Actualizar campos de Sesión)
router.put("/:id", async (req, res) => {
    const sessionId = req.params.id;
    const professionalId = getProfessionalId(req); 

    const parsed = sessionUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            message: "Error de validación al actualizar la sesión.",
            details: parsed.error.errors,
        });
    }
    const updates = parsed.data;

    try {
        const existingSession = await prisma.session.findUnique({
            where: {
                id: sessionId,
                professionalId: professionalId, 
            },
        });

        if (!existingSession) {
            return res.status(404).json({ message: "Sesión no encontrada o sin permisos." });
        }
        
        const sessionData = {
            datetime: updates.datetime ? new Date(updates.datetime) : undefined,
            durationMinutes: updates.durationMinutes,
            modality: updates.modality,
            location: updates.location,
            notes: updates.notes,
        };

        const updatedRecord = await prisma.session.update({
            where: { id: sessionId },
            data: sessionData,
            include: {
                patient: { select: { id: true, firstName: true, lastName: true, curp: true } },
                professional: { select: { id: true, name: true, email: true } },
            },
        });

        return res.json(normalizeSessionOutput(updatedRecord));

    } catch (error) {
        console.error("[Sessions] Update error:", error);
        return res.status(500).json({ message: "Error al actualizar la sesión." });
    }
});


router.put("/:id/status", async (req, res) => {
    const sessionId = req.params.id;
    const professionalId = getProfessionalId(req);

    const parsed = sessionStatusSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ 
            message: "Estado o datos de actualización inválidos.", 
            details: parsed.error.errors 
        });
    }

    const { status: newStatus, reason } = parsed.data; 

    try {
        const existingSession = await prisma.session.findUnique({
            where: { id: sessionId, professionalId: professionalId },
        });

        if (!existingSession) {
            return res.status(404).json({ message: "Sesión no encontrada o sin permisos." });
        }

        // Lógica de Notas: Si hay una razón proporcionada, la usamos. Si no, forzamos NULL.
        const notesToUpdate = (reason && reason.trim().length > 0) 
            ? reason.trim() 
            : null; 

        const updatedSession = await prisma.session.update({
            where: { id: sessionId },
            data: { 
                status: newStatus, 
                updatedAt: new Date().toISOString(), 
                notes: notesToUpdate,
            },
            include: {
                patient: { select: { id: true, firstName: true, lastName: true, curp: true } },
                professional: { select: { id: true, name: true, email: true } },
            },
        });

        // Registrar evento de auditoría
        pushAuditEvent({
            event: "session_status_changed",
            meta: { sessionId, newStatus, professionalId, reason: notesToUpdate },
            at: updatedSession.updatedAt,
        });

        return res.json(normalizeSessionOutput(updatedSession));
    } catch (error) {
        console.error("[Sessions] Status Update Failed:", error);
        console.error("[Sessions] Status Change Error:", error);

        return res.status(500).json({ message: "Error al cambiar el estado de la sesión." });
    }
});


// 7. PUT /:id/link-note (Vincular Nota)
router.put("/:id/link-note", async (req, res) => {
    const sessionId = req.params.id;
    const professionalId = getProfessionalId(req);
    
    const parsed = sessionLinkNoteSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: "ID de nota inválido." });
    }
    const { noteId } = parsed.data;
    
    try {
        const existingSession = await prisma.session.findUnique({
            where: { id: sessionId, professionalId: professionalId },
        });

        if (!existingSession) {
            return res.status(404).json({ message: "Sesión no encontrada o sin permisos." });
        }

        
        const updatedSession = await prisma.session.update({
            where: { id: sessionId },
            data: { noteId, updatedAt: new Date().toISOString() },
            include: {
                patient: { select: { id: true, firstName: true, lastName: true, curp: true } },
                professional: { select: { id: true, name: true, email: true } },
            },
        });

        return res.json(normalizeSessionOutput(updatedSession));
    } catch (error) {
        console.error("[Sessions] Link Note Error:", error);
        return res.status(500).json({ message: "Error al vincular la nota." });
    }
});


// --- 8. RUTAS MÁS GENÉRICAS (Ordenadas al final) ---

// 9. GET /today-counts
router.get("/today-counts", async (req, res) => {
    const professionalId = getProfessionalId(req);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const whereClause = {
        professionalId: professionalId,
        datetime: { gte: today, lt: tomorrow },
    };

    try {
        const list = await prisma.session.findMany({
            where: whereClause,
            select: { status: true },
        });
        
        const counts = list.reduce(
            (acc, session) => {
                if (session.status === "CANCELLED") acc.cancelled += 1;
                if (session.status === "SCHEDULED") acc.scheduled += 1;
                acc.total += 1;
                return acc; 
            },
            { scheduled: 0, cancelled: 0, total: 0 }
        );

        return res.json(counts);

    } catch (error) {
        return res.status(500).json({ message: "Error al obtener conteos de hoy." });
    }
});


export default router;