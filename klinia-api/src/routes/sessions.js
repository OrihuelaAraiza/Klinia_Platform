import { Router } from "express";
import { z } from "zod";
// Importaciones de servicios y estructuras necesarias
import { prisma } from "../services/dbClient.js"; // Cliente Prisma
import { uid, pushAuditEvent } from "../store/memory.js"; // Funciones auxiliares
// import { listSessions } from "../services/sessionsService"; // Se mantiene por si ya existe

// Ajustamos la importación de esquemas para usar la convención 'sessionCreateSchema'
// Asumo que estos esquemas ahora tienen la validación para Modality y Status de Prisma (ENUMS)
// Necesitas asegurar que sessionCreateSchema espera 'durationMinutes' (plural)
import {
  sessionCreateSchema,
  sessionUpdateSchema,
  sessionStatusSchema,
  sessionLinkNoteSchema,
} from "../validators/sessionSchemas.js";


// 🛑 Los ENUMS deben coincidir con los de tu esquema Prisma (Modality / Status)
export const SESSION_STATUS = {
  PROGRAMADA: "SCHEDULED",
  CONFIRMADA: "CONFIRMED", 
  ATENDIDA: "COMPLETED",
  NO_PRESENTADA: "NO_SHOW",
  CANCELADA: "CANCELLED",
};

const TERMINAL_STATUSES = new Set([
  SESSION_STATUS.ATENDIDA,
  SESSION_STATUS.NO_PRESENTADA,
  SESSION_STATUS.CANCELADA,
]);

// 🛑 Definición de esquemas de consulta adaptados para Prisma
const querySchema = z.object({
  q: z.string().optional().default(""), // Para búsqueda de paciente/profesional
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.nativeEnum(SESSION_STATUS).optional(), // Validamos con el ENUM de Prisma
  page: z.coerce.number().int().positive().default(1),
  size: z.coerce.number().int().positive().max(100).default(10),
});

const byPatientQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  size: z.coerce.number().int().positive().max(100).default(10),
});

const router = Router();

// Función que mapea estados (español) a ENUMS de Prisma (inglés)
function mapStatusToPrisma(status) {
    switch (status) {
        case "programada": return "SCHEDULED";
        case "confirmada": return "SCHEDULED";
        case "atendida": return "COMPLETED";
        case "no_presentada": return "NO_SHOW";
        case "cancelada": return "CANCELLED";
        default: return "SCHEDULED";
    }
}

function parseDateParam(value, { endOfDay = false } = {}) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  if (endOfDay) {
    if (typeof value === "string" && !value.includes("T")) {
        date.setHours(23, 59, 59, 999);
    }
  }
  return date;
}

// --- POST /sessions (Crear Sesión) ---
router.post("/sessions", async (req, res) => {
    // 🛑 Paso 1: Transformar el payload si el frontend envía 'durationMin'
    const rawPayload = req.body;

    if (rawPayload.durationMin !== undefined) {
        rawPayload.durationMinutes = rawPayload.durationMin;
        delete rawPayload.durationMin;
    }
    
    const parsed = sessionCreateSchema.safeParse(rawPayload);

    if (!parsed.success) {
        return res.status(400).json({ 
            message: "Error de validación de datos de la sesión.",
            details: parsed.error.errors,
            rawPayload: rawPayload,
        });
    }

router.get("/today-counts", (req, res) => {
  const { startMs, endMs } = getTodayBounds();
  const list = getSessionsArray().filter((session) => {
    const time = session.datetime ? Date.parse(session.datetime) : NaN;
    if (Number.isNaN(time)) {
      return false;
    }
});

router.get("/", (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message || "Parámetros inválidos" });
  }
  const { q, from, to, status, page, size } = parsed.data;
  const search = q.toLowerCase();
  const fromDate = parseDateParam(from);
  const toDate = parseDateParam(to, { endOfDay: true });
  const filtered = getSessionsArray().filter((session) =>
    matchFilters(session, {
      search,
      fromDate,
      toDate,
      status: status || undefined,
    })
  );
  res.json(paginate(filtered.map(normalizeSessionOutput), Number(page), Number(size)));
});

// 🛑 Incluyo las demás rutas listado/conteo/etc. que no estaban en la selección,
// asumiendo que ya tienes una versión funcional.
router.get("/sessions/today-counts", async (req, res) => {
    // Implementación usando Prisma
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
        const list = await prisma.session.findMany({
            where: {
                datetime: {
                    gte: today,
                    lt: tomorrow,
                },
            },
            select: { status: true },
        });

        const counts = list.reduce(
            (acc, session) => {
                if (session.status === "CANCELLED") {
                    acc.cancelled += 1;
                }
                if (
                    session.status === "SCHEDULED" 
                ) {
                    acc.scheduled += 1;
                }
                return acc;
            },
            { scheduled: 0, cancelled: 0, total: list.length }
        );
        res.json(counts);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener conteos de hoy." });
    }
});

router.post("/", (req, res) => {
  const parsed = sessionCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message || "Datos inválidos" });
  }
  const payload = parsed.data;
  const patient = ensurePatientExists(payload.patientId);
  const now = new Date().toISOString();
  const id = uid("ses_");
  const session = {
    id,
    patientId: payload.patientId,
    patientName: payload.patientName || buildPatientName(patient, payload.patientId),
    professionalId: payload.professionalId || "",
    professionalName: payload.professionalName || "",
    datetime: payload.datetime,
    durationMin: payload.durationMin,
    status: payload.status,
    noteId: payload.noteId || null,
    modality: payload.modality || "presencial",
    location: payload.location?.trim() || "",
    notes: payload.notes?.trim() || "",
    createdAt: now,
    updatedAt: now,
  };
  try {
    ensureVirtualLocation(session);
  } catch (error) {
    return res.status(error.status || 400).json({ message: error.message });
  }

router.get("/sessions", async (req, res) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0]?.message || "Parámetros inválidos" });
    }
    
    const { q, from, to, status, page, size } = parsed.data;
    const skip = (page - 1) * size;

    const fromDate = parseDateParam(from);
    const toDate = parseDateParam(to, { endOfDay: true });

    const whereClause = {
        datetime: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
        },
        ...(status ? { status: mapStatusToPrisma(status) } : {}),
    };
    
    if (q) {
        const searchClause = {
            OR: [
                { patientId: { contains: q, mode: 'insensitive' } },
                { professionalId: { contains: q, mode: 'insensitive' } },
            ]
        };
        whereClause.AND = [whereClause.AND, searchClause].filter(Boolean);
    }

router.put("/:id", (req, res) => {
  const parsed = sessionUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message || "Datos inválidos" });
  }
  const existing = sessions.get(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: "Sesión no encontrada" });
  }
  if (TERMINAL_STATUSES.has(existing.status)) {
    return res.status(409).json({ message: "Las sesiones finalizadas no pueden editarse" });
  }

    try {
        const [total, records] = await prisma.$transaction([
            prisma.session.count({ where: whereClause }),
            prisma.session.findMany({
                where: whereClause,
                include: { 
                    patient: {
                        select: { id: true, firstName: true, lastName: true, curp: true }
                    }, 
                    professional: { select: { id: true, name: true, email: true } } 
                },
                skip,
                take: size,
                orderBy: { datetime: "desc" },
            })
        ]);

        res.json({
            items: records, 
            page,
            size,
            total,
        });

    } catch (error) {
        res.status(500).json({ message: "Error al consultar sesiones." });
    }
});

router.put("/:id/status", (req, res) => {
  const parsed = sessionStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message || "Datos inválidos" });
  }
  const existing = sessions.get(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: "Sesión no encontrada" });
  }
  const nextStatus = parsed.data.status;
  try {
    assertStatusTransition(existing.status, nextStatus);
  } catch (error) {
    return res.status(error.status || 409).json({ message: error.message });
  }
  existing.status = nextStatus;
  existing.updatedAt = new Date().toISOString();
  sessions.set(existing.id, existing);
  pushAuditEvent({
    event: "session_status_change",
    meta: { sessionId: existing.id, patientId: existing.patientId, status: nextStatus },
    at: existing.updatedAt,
  });
  res.json(normalizeSessionOutput(existing));
});

router.put("/:id/link-note", (req, res) => {
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

router.get("/:id.ics", (req, res) => {
  const existing = sessions.get(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: "Sesión no encontrada" });
  }
  if (!existing.datetime) {
    return res.status(400).json({ message: "La sesión no tiene fecha programada" });
  }
  const start = new Date(existing.datetime);
  if (Number.isNaN(start.getTime())) {
    return res.status(400).json({ message: "Fecha inválida" });
  }
  const duration = Number(existing.durationMin || 50);
  const end = new Date(start.getTime() + duration * 60 * 1000);
  const STATUS_TO_ICS = {
    [SESSION_STATUS.PROGRAMADA]: "TENTATIVE",
    [SESSION_STATUS.CONFIRMADA]: "CONFIRMED",
    [SESSION_STATUS.ATENDIDA]: "COMPLETED",
    [SESSION_STATUS.NO_PRESENTADA]: "DECLINED",
    [SESSION_STATUS.CANCELADA]: "CANCELLED",
  };
  const payload = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Klinia//Sessions//ES",
    "BEGIN:VEVENT",
    `UID:${existing.id}@klinialabs.mx`,
    `DTSTAMP:${formatForIcs(new Date())}`,
    `DTSTART:${formatForIcs(start)}`,
    `DTEND:${formatForIcs(end)}`,
    `SUMMARY:${escapeIcsText(`Sesión con ${existing.patientName || "paciente"}`)}`,
    existing.location ? `LOCATION:${escapeIcsText(existing.location)}` : null,
    existing.notes ? `DESCRIPTION:${escapeIcsText(existing.notes)}` : null,
    `STATUS:${STATUS_TO_ICS[existing.status] || "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="session-${existing.id}.ics"`);
  res.send(payload);
});

export default router;