import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  hasUser,
  kycRecordsByUserId,
  pushAuditEvent,
  uid,
  usersByEmail,
} from "../store/memory.js";

const router = Router();

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const CURP_REGEX =
  /^[A-Z][AEIOU][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HM](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS)[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]\d$/;
const RFC_REGEX = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/;
const PHONE_REGEX = /^\d{10}$/;
const POSTAL_CODE_REGEX = /^\d{5}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MEXICO_STATES = [
  "AGUASCALIENTES",
  "BAJA_CALIFORNIA",
  "BAJA_CALIFORNIA_SUR",
  "CAMPECHE",
  "COAHUILA",
  "COLIMA",
  "CHIAPAS",
  "CHIHUAHUA",
  "CIUDAD_DE_MEXICO",
  "DURANGO",
  "GUANAJUATO",
  "GUERRERO",
  "HIDALGO",
  "JALISCO",
  "MEXICO",
  "MICHOACAN",
  "MORELOS",
  "NAYARIT",
  "NUEVO_LEON",
  "OAXACA",
  "PUEBLA",
  "QUERETARO",
  "QUINTANA_ROO",
  "SAN_LUIS_POTOSI",
  "SINALOA",
  "SONORA",
  "TABASCO",
  "TAMAULIPAS",
  "TLAXCALA",
  "VERACRUZ",
  "YUCATAN",
  "ZACATECAS",
];

function emitAudit(event, meta = {}) {
  pushAuditEvent({
    event,
    meta,
    at: new Date().toISOString(),
  });
}

function isAdult(birthDate) {
  if (!DATE_REGEX.test(birthDate)) {
    return false;
  }
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }
  return age >= 18;
}

const emailSchema = z
  .string({ required_error: "Correo requerido" })
  .trim()
  .min(1, { message: "Correo requerido" })
  .email({ message: "Correo invalido" })
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string({ required_error: "Contraseña requerida" })
  .min(8, { message: "La contraseña debe tener al menos 8 caracteres" })
  .regex(PASSWORD_REGEX, {
    message: "Debe incluir al menos una letra y un numero",
  });

const identitySchema = z.object({
  firstName: z
    .string({ required_error: "Nombre requerido" })
    .trim()
    .min(2, { message: "Nombre muy corto" }),
  lastName: z
    .string({ required_error: "Apellido requerido" })
    .trim()
    .min(2, { message: "Apellido muy corto" }),
  curp: z
    .string({ required_error: "CURP requerido" })
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => CURP_REGEX.test(value), {
      message: "CURP invalido",
    }),
  rfc: z
    .string()
    .trim()
    .optional()
    .transform((value) => {
      if (!value) {
        return undefined;
      }
      const upper = value.toUpperCase();
      return upper || undefined;
    })
    .refine(
      (value) => value === undefined || RFC_REGEX.test(value),
      {
        message: "RFC invalido",
      }
    ),
  birthDate: z
    .string({ required_error: "Fecha de nacimiento requerida" })
    .trim()
    .regex(DATE_REGEX, { message: "Fecha de nacimiento invalida" })
    .refine((value) => isAdult(value), {
      message: "Debe ser mayor de 18 años.",
    }),
});

const registerCompleteSchema = z.object({
  access: z.object({
    email: emailSchema,
    password: passwordSchema,
  }),
  identity: identitySchema,
  address: z.object({
    street: z
      .string({ required_error: "Calle requerida" })
      .trim()
      .min(1, { message: "Calle requerida" }),
    neighborhood: z
      .string({ required_error: "Colonia requerida" })
      .trim()
      .min(1, { message: "Colonia requerida" }),
    postalCode: z
      .string({ required_error: "Codigo postal requerido" })
      .trim()
      .regex(POSTAL_CODE_REGEX, { message: "Codigo postal invalido" }),
    city: z
      .string({ required_error: "Ciudad requerida" })
      .trim()
      .min(1, { message: "Ciudad requerida" }),
    state: z
      .string({ required_error: "Estado requerido" })
      .trim()
      .min(1, { message: "Estado requerido" })
      .refine((value) => MEXICO_STATES.includes(value), {
        message: "Estado invalido",
      }),
  }),
  contact: z.object({
    phone: z
      .string({ required_error: "Telefono requerido" })
      .trim()
      .regex(PHONE_REGEX, { message: "Telefono invalido" }),
    emergencyName: z
      .string({ required_error: "Contacto de emergencia requerido" })
      .trim()
      .min(2, { message: "Contacto de emergencia invalido" }),
    emergencyPhone: z
      .string({ required_error: "Telefono de emergencia requerido" })
      .trim()
      .regex(PHONE_REGEX, { message: "Telefono de emergencia invalido" }),
  }),
  documents: z.object({
    idOrPassportFileId: z
      .string({ required_error: "Identificacion requerida" })
      .trim()
      .min(1, { message: "Identificacion requerida" }),
    professionalLicenseFileId: z
      .string({ required_error: "Cedula requerida" })
      .trim()
      .min(1, { message: "Cedula requerida" }),
    universityDegreeFileId: z
      .string({ required_error: "Titulo requerido" })
      .trim()
      .min(1, { message: "Titulo requerido" }),
    proofOfAddressFileId: z
      .string({ required_error: "Comprobante requerido" })
      .trim()
      .min(1, { message: "Comprobante requerido" }),
  }),
  face: z.object({
    selfieFileId: z
      .string({ required_error: "Selfie requerida" })
      .trim()
      .min(1, { message: "Selfie requerida" }),
  }),
});

router.post("/register/complete", async (req, res, next) => {
  const timestamp = new Date().toISOString();
  const emailForAudit = String(req.body?.access?.email || "").trim().toLowerCase();

  try {
    const payload = registerCompleteSchema.parse(req.body);
    const email = payload.access.email;

    if (hasUser(email)) {
      emitAudit("auth_register_failed", {
        email,
        reason: "duplicate",
      });
      return res
        .status(409)
        .json({ message: "Este correo ya esta registrado." });
    }

    const passwordHash = await bcrypt.hash(payload.access.password, 8);
    const userId = uid("U_");
    const fullName = `${payload.identity.firstName} ${payload.identity.lastName}`.trim();

    usersByEmail.set(email, {
      id: userId,
      email,
      name: fullName,
      role: "PROFESSIONAL",
      passwordHash,
      createdAt: timestamp,
    });

    kycRecordsByUserId.set(userId, {
      id: uid("KYC_"),
      userId,
      identity: payload.identity,
      address: payload.address,
      contact: payload.contact,
      documents: payload.documents,
      face: payload.face,
      createdAt: timestamp,
    });

    const responseBody = {
      userId,
      email,
      role: "PROFESSIONAL",
    };

    emitAudit("auth_register_success", responseBody);

    return res.status(201).json(responseBody);
  } catch (error) {
    emitAudit("auth_register_failed", {
      email: emailForAudit,
      reason: error instanceof z.ZodError ? "validation" : "error",
      message: error?.message,
    });
    return next(error);
  }
});

export default router;
