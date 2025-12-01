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

// --- BASE SCHEMA ---
// Contiene todos los campos de PatientRecord y User (email)
const basePatientDataSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  curp: z
    .string()
    .length(18, { message: "El CURP debe tener 18 caracteres" })
    .regex(CURP_REGEX, { message: "CURP inválido" })
    .optional() // Lo hago opcional ya que no siempre se proporciona al registrar
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
  
  // Datos de Contacto de Emergencia
  emergencyName: z.string().min(1).max(80),
  emergencyPhone: z.string().regex(PHONE_REGEX, { message: "Teléfono de emergencia inválido" }),
  
  attachments: z.array(attachmentSchema).optional().default([]),
});
// --------------------


// 1. Esquema para la Creación por Terapeuta/Admin (POST /api/patients)
// Incluye campos requeridos en la DB que el Terapeuta debe proporcionar.
export const patientCreationSchema = basePatientDataSchema.extend({
    // Campos requeridos por el modelo PatientRecord en la DB
    referral: z.string().min(1), 
    purpose: z.string().min(10), 
    
    // El terapeuta NO envía password
}).omit({
    // Omite campos que no aplican o tienen otro manejo en el registro por Terapeuta
    attachments: true, 
});


// 2. Esquema original (puedes llamarlo AuthRegister si es para el paciente)
// Si esta es la base del esquema que usa el paciente para registrarse solo.
export const patientAuthRegisterSchema = basePatientDataSchema.extend({
    referral: z.string().min(1), 
    purpose: z.string().min(10), 
    
    // NOTA: EL ESQUEMA DE REGISTRO DEL PACIENTE TAMBIÉN DEBE INCLUIR LAS REGLAS DE PASSWORD
    // password: z.string().min(8), 
    // confirmPassword: z.string().min(1),
}).refine(
    // (data) => data.password === data.confirmPassword,
    // { message: "Las contraseñas no coinciden", path: ["confirmPassword"] }
    // Dejo esto comentado ya que no incluiste los campos de password
    () => true
);

// 3. Esquema de Actualización (El que ya tenías)
export const patientUpdateSchema = basePatientDataSchema.extend({
    // Añade los campos de PatientRecord a la lista de opcionales
    referral: z.string().min(1).optional(), 
    purpose: z.string().min(10).optional(), 
    emergencyName: z.string().min(1).optional(),
    emergencyPhone: z.string().regex(PHONE_REGEX).optional(),
}).partial();


export const consentTypeSchema = z.enum(["attention", "recording", "ai_use"], {
  message: "Tipo de consentimiento inválido",
});


export default {
  patientCreationSchema, // Renombrado para que coincida con la importación en patients.js
  patientAuthRegisterSchema,
  patientUpdateSchema,
  consentTypeSchema,
};