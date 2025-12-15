import { z } from "zod";
import { prisma } from "../services/dbClient.js";

// --- DEFINICIONES ZOD ENUM ---
const ModalityEnum = z.enum(["IN_PERSON", "TELEMEDICINE", "HOME_VISIT"]);
const StatusEnum = z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"]);

const StatusLiteralUnion = z.union([
    z.literal("SCHEDULED"),
    z.literal("COMPLETED"),
    z.literal("CANCELLED"),
    z.literal("NO_SHOW"),
]);

const futureDatetimeSchema = z
    .string()
    .min(1, { message: "Fecha y hora requeridas." })
    .refine((value) => !Number.isNaN(Date.parse(value)), { message: "Fecha inválida" })
    .refine(
        (value) => {
            const date = Date.parse(value);
            if (Number.isNaN(date)) {
                return false;
            }
            return date > Date.now();
        },
        { message: "La fecha debe ser futura" }
    );

const baseSessionSchema = z.object({
    professionalId: z.string().min(1, { message: "ID de profesional requerido." }),
    patientId: z.string().min(1, { message: "ID de paciente requerido." }),
    
    datetime: futureDatetimeSchema, 

    durationMinutes: z.coerce.number().int().min(15).max(180),
    
    modality: ModalityEnum,
    
    status: StatusEnum.default("SCHEDULED"), 
    
    location: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});


export const sessionCreateSchema = baseSessionSchema;

export const sessionUpdateSchema = baseSessionSchema.partial().extend({});

export const sessionStatusSchema = z.object({
   status: z.string().min(1, { message: "El estado es requerido." }), // ⬅️ Aceptamos cualquier cadena
        reason: z.string().optional(),
});

export const sessionLinkNoteSchema = z.object({
    noteId: z.string().min(1),
});