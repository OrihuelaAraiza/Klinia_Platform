import { z } from "zod";

const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_REGEX = /^\d{10}$/;

const attachmentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(200),
  type: z.enum(["PDF", "JPG", "PNG"], {
    errorMap: () => ({ message: "Tipo de archivo inválido" }),
  }),
  size: z.number().nonnegative(),
});

const basePatientSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  curp: z
    .string()
    .length(18, { message: "El CURP debe tener 18 caracteres" })
    .regex(CURP_REGEX, { message: "CURP inválido" })
    .transform((value) => value.toUpperCase()),
  birthDate: z
    .string()
    .regex(DATE_REGEX, { message: "Fecha inválida" }),
  sex: z.enum(["M", "F", "X"], { message: "Sexo inválido" }),
  phone: z
    .string()
    .regex(PHONE_REGEX, { message: "Teléfono inválido" }),
  email: z.string().email({ message: "Correo inválido" }).transform((value) => value.toLowerCase()),
  attachments: z.array(attachmentSchema).optional().default([]),
});

export const patientCreateSchema = basePatientSchema;

export const patientUpdateSchema = basePatientSchema.partial({
  firstName: true,
  lastName: true,
  curp: true,
  birthDate: true,
  sex: true,
  phone: true,
  email: true,
  attachments: true,
});

export const consentTypeSchema = z.enum(["attention", "recording", "ai_use"], {
  message: "Tipo de consentimiento inválido",
});

export default {
  patientCreateSchema,
  patientUpdateSchema,
  consentTypeSchema,
};
