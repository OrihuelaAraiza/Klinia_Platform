import { Router } from "express";
import { z } from "zod";

// Servicios
import { prisma } from "../services/dbClient.js";
import { pushAuditEvent } from "../store/memory.js";

// Schemas
import {
    sessionCreateSchema,
    sessionUpdateSchema,
    sessionStatusSchema,
    sessionLinkNoteSchema,
} from "../validators/sessionSchemas.js";


// --- ENUMS Y ESQUEMAS ---

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
    page: z.coerce.number().int().positive().default(1),
    size: z.coerce.number().int().positive().max(100).default(10),
});

const router = Router();


// ---------------------------------------------
// 🔧 Funciones Auxiliares
// ---------------------------------------------

function mapStatusToPrisma(status) {
    switch (status) {
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


// ---------------------------------------------
// 1. POST / (Crear sesión) | Mapea a POST /api/sessions
// ---------------------------------------------
router.post("/", async (req, res) => {
    const rawPayload = req.body;

    // Transformación para compatibilidad (duración)
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

function ensurePatientExists(patientId) {
  if (!patients.has(patientId)) {
    throw Object.assign(new Error("Patient not found"), { status: 404 });
  }
}

    try {
        const [patient, professional] = await prisma.$transaction([
            prisma.patientRecord.findUnique({ where: { id: data.patientId } }),
            prisma.user.findUnique({ where: { id: data.professionalId } }),
        ]);

        if (!patient) return res.status(404).json({ message: "Paciente no encontrado." });
        
        // 🚨 La validación que está fallando por el ID "user"
        if (!professional) return res.status(404).json({ message: "Profesional no encontrado." }); 

        // Crear sesión
        const newSession = await prisma.session.create({
            data: {
                professionalId: data.professionalId,
                patientId: data.patientId,
                datetime: new Date(data.datetime),
                durationMinutes: data.durationMinutes,
                modality: data.modality,
                status: data.status,
                location: rawPayload.location || null,
                notes: rawPayload.notes || null,
            },
        });

        pushAuditEvent({
            event: "session_created",
            meta: { id: newSession.id, professionalId: newSession.professionalId },
            at: new Date().toISOString(),
        });

        // Devolver con detalles
        const full = await prisma.session.findUnique({
            where: { id: newSession.id },
            include: {
                patient: { select: { id: true, firstName: true, lastName: true, curp: true } },
                professional: { select: { id: true, name: true, email: true } },
            },
        });

        return res.status(201).json(full);

    } catch (error) {
        console.error("[Sessions] Creation error:", error);
        return res.status(500).json({ message: "Error al agendar la sesión." });
    }
});


// ---------------------------------------------
// 2. GET /today-counts | Mapea a GET /api/sessions/today-counts
// ---------------------------------------------
router.get("/today-counts", async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
        const list = await prisma.session.findMany({
            where: {
                datetime: { gte: today, lt: tomorrow },
            },
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

router.post("/sessions", (req, res) => {
  const parsed = sessionCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message || "Datos inválidos" });
  }
  const payload = parsed.data;
  ensurePatientExists(payload.patientId);
  const now = new Date().toISOString();
  const id = uid("ses_");
  const session = {
    id,
    patientId: payload.patientId,
    patientName: payload.patientName || "",
    professionalId: payload.professionalId || "",
    professionalName: payload.professionalName || "",
    datetime: payload.datetime,
    durationMin: payload.durationMin,
    status: payload.status,
    noteId: payload.noteId || null,
    notes: payload.notes || "",
    createdAt: now,
    updatedAt: now,
  };
});
// ---------------------------------------------
// 3. GET / (Listar sesiones) | Mapea a GET /api/sessions
// ---------------------------------------------
router.get("/", async (req, res) => {
    const parsed = querySchema.safeParse(req.query);

    if (!parsed.success) {
        return res.status(400).json({
            message: parsed.error.issues[0]?.message || "Parámetros inválidos",
        });
    }

    const { q, from, to, status, page, size } = parsed.data;
    const skip = (page - 1) * size;

    const fromDate = parseDateParam(from);
    const toDate = parseDateParam(to, { endOfDay: true });

    const where = {
        datetime: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
        },
        ...(status ? { status: mapStatusToPrisma(status) } : {}),
    };

    if (q) {
        where.OR = [
            { patientId: { contains: q, mode: "insensitive" } },
            { professionalId: { contains: q, mode: "insensitive" } },
        ];
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

        return res.json({ items: records, total, page, size });

    } catch (error) {
        return res.status(500).json({ message: "Error al consultar sesiones." });
    }
});

router.put("/sessions/:id", (req, res) => {
  const parsed = sessionUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message || "Datos inválidos" });
  }
  const existing = sessions.get(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: "Sesión no encontrada" });
  }
});

router.put("/sessions/:id/link-note", (req, res) => {
  const parsed = sessionLinkNoteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message || "Datos inválidos" });
  }
  const existing = sessions.get(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: "Sesión no encontrada" });
  }
  const noteId = parsed.data.noteId;
  const patientNotes = notesByPatient.get(existing.patientId) || [];
  const noteExists = patientNotes.some((note) => note.id === noteId);
  if (!noteExists) {
    return res.status(404).json({ message: "Nota no encontrada para este paciente" });
  }
  existing.noteId = noteId;
  existing.updatedAt = new Date().toISOString();
  sessions.set(existing.id, existing);
  pushAuditEvent({
    event: "session_note_link",
    meta: { sessionId: existing.id, patientId: existing.patientId, noteId },
    at: existing.updatedAt,
  });
  res.json(normalizeSessionOutput(existing));
});

export default router;
