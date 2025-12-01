import { z } from "zod";

// 🛑 ENUMS de Prisma (Debe coincidir con la definición de tu schema.prisma)
const ModalityEnum = z.enum(["IN_PERSON", "TELEMEDICINE", "HOME_VISIT"]);
const StatusEnum = z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"]);

// Esquema para validar que la fecha sea futura (mantenemos tu lógica)
const futureDatetimeSchema = z
    .string()
    .min(1, { message: "Fecha y hora requeridas" })
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

// Esquema Base para la creación de una sesión
const baseSessionSchema = z.object({
    professionalId: z.string().min(1, { message: "ID de profesional requerido." }),
    patientId: z.string().min(1, { message: "ID de paciente requerido." }),
    
    // Usamos el esquema de validación de fecha futura que definiste
    datetime: futureDatetimeSchema, 

    // El frontend SessionForm está enviando esto como 'durationMinutes' después de la transformación en el router
    durationMinutes: z.coerce.number().int().min(15).max(180),
    
    modality: ModalityEnum,
    
    // El status siempre se debe enviar como SCHEDULED al crear
    status: StatusEnum.default("SCHEDULED"), 
    
    location: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});

// --- Esquemas Exportados ---

export const sessionCreateSchema = baseSessionSchema;

export const sessionUpdateSchema = baseSessionSchema.partial().extend({
    // La duración en update usa durationMinutes, que ya es un campo opcional en baseSessionSchema.partial
    // Mantenemos solo la estructura parcial
});

export const sessionStatusSchema = z.object({
    // Permite cualquier estado final o SCHEDULED para la transición
    status: StatusEnum, 
});

export const sessionLinkNoteSchema = z.object({
    noteId: z.string().min(1),
});