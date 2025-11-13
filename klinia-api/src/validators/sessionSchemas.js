import { z } from "zod";

const statusEnum = z.enum([
  "programada",
  "confirmada",
  "atendida",
  "no_presentada",
  "cancelada",
]);

const modalityEnum = z.enum(["presencial", "virtual"]);

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

export const sessionCreateSchema = z.object({
  patientId: z.string().min(1, { message: "patientId requerido" }),
  professionalId: z.string().optional().default(""),
  professionalName: z.string().optional(),
  datetime: futureDatetimeSchema,
  durationMin: z
    .coerce.number()
    .int()
    .min(15, { message: "Duración mínima 15 minutos" })
    .max(180, { message: "Duración máxima 180 minutos" })
    .default(50),
  status: statusEnum.optional().default("programada"),
  modality: modalityEnum.optional().default("presencial"),
  location: z.string().trim().optional(),
  notes: z.string().optional(),
});

export const sessionUpdateSchema = z.object({
  patientId: z.string().min(1).optional(),
  professionalId: z.string().optional(),
  professionalName: z.string().optional(),
  datetime: futureDatetimeSchema.optional(),
  durationMin: z
    .coerce.number()
    .int()
    .min(15, { message: "Duración mínima 15 minutos" })
    .max(180, { message: "Duración máxima 180 minutos" })
    .optional(),
  status: statusEnum.optional(),
  modality: modalityEnum.optional(),
  location: z.string().trim().optional(),
  notes: z.string().optional(),
});

export const sessionStatusSchema = z.object({
  status: statusEnum,
});

export const sessionLinkNoteSchema = z.object({
  noteId: z.string().min(1, { message: "noteId requerido" }),
});
