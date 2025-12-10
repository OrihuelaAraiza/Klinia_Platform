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

const basePatientDataSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  curp: z
    .string()
    .length(18, { message: "El CURP debe tener 18 caracteres" })
    .regex(CURP_REGEX, { message: "CURP inválido" })
    .optional() 
    .or(z.literal("").transform(() => undefined))
    .transform((value) => value ? value.toUpperCase() : undefined),
  birthDate: z
    .string()
    .regex(DATE_REGEX, { message: "Fecha inválida" }),
  gender: z.enum(["M", "F", "X"], { message: "Género inválido" }), 
  phone: z
    .string()
    .regex(PHONE_REGEX, { message: "Teléfono inválido" }),
  email: z.string().email({ message: "Correo inválido" }).transform((value) => value.toLowerCase()),
  
  emergencyName: z.string().min(1).max(80),
  emergencyPhone: z.string().regex(PHONE_REGEX, { message: "Teléfono de emergencia inválido" }),
  
  attachments: z.array(attachmentSchema).optional().default([]),
});



export const patientCreationSchema = basePatientDataSchema.extend({
    referral: z.string().min(1), 
    purpose: z.string().min(10), 
    
}).omit({
    attachments: true, 
});


export const patientAuthRegisterSchema = basePatientDataSchema.extend({
    referral: z.string().min(1), 
    purpose: z.string().min(10), 
    
}).refine(
    () => true
);

export const patientUpdateSchema = basePatientDataSchema.extend({
    referral: z.string().min(1).optional(), 
    purpose: z.string().min(10).optional(), 
    emergencyName: z.string().min(1).optional(),
    emergencyPhone: z.string().regex(PHONE_REGEX).optional(),
}).partial();


export const consentTypeSchema = z.enum(["attention", "recording", "ai_use"], {
  message: "Tipo de consentimiento inválido",
});


export default {
  patientCreationSchema, 
  patientAuthRegisterSchema,
  patientUpdateSchema,
  consentTypeSchema,
};