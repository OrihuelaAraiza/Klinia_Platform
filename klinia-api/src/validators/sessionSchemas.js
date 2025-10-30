import { z } from "zod";

const statusEnum = z.enum([
  "programada",
  "confirmada",
  "atendida",
  "no_presentada",
  "cancelada",
]);

export const sessionCreateSchema = z.object({
  patientId: z.string().min(1, { message: "patientId requerido" }),
  professionalId: z.string().min(1, { message: "professionalId requerido" }).optional().default(""),
  professionalName: z.string().optional(),
  datetime: z
    .string()
    .min(1, { message: "Fecha y hora requeridas" })
    .refine((value) => !Number.isNaN(Date.parse(value)), { message: "Fecha inválida" }),
  durationMin: z.coerce.number().int().positive().max(240).default(50),
  status: statusEnum.optional().default("programada"),
  notes: z.string().optional(),
});

export const sessionUpdateSchema = sessionCreateSchema.partial().extend({
  patientId: z.string().min(1).optional(),
});

export const sessionStatusSchema = z.object({
  status: statusEnum,
});

export const sessionLinkNoteSchema = z.object({
  noteId: z.string().min(1, { message: "noteId requerido" }),
});
