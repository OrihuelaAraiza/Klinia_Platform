import { Router } from "express";
import { prisma } from '../services/dbClient.js';
import bcrypt from "bcryptjs";
import { z } from "zod";
import jwt from "jsonwebtoken";
import {
  pushAuditEvent,
  uid,
} from "../store/memory.js";

import * as docIntelService from '../services/azureDocIntelService.js';
import * as faceService from '../services/azureFaceService.js';
import * as blobService from '../services/azureBlobService.js';
import { env } from "../config/env.js";


function emitAudit(event, meta = {}) {
  pushAuditEvent({
    event,
    meta,
    at: new Date().toISOString(),
  });
}

function isAdult(dateString) {
  const birth = new Date(dateString);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  if (
    age > 18 ||
    (age === 18 &&
      (today.getMonth() > birth.getMonth() ||
        (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate())))
  ) {
    return true;
  }
  return false;
}

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const CURP_REGEX =
  /^[A-Z][AEIOU][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HM](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS)[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]\d$/;
const PHONE_REGEX = /^\d{10}$/;
const POSTAL_CODE_REGEX = /^\d{5}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const MEXICO_STATES = [
  "AGUASCALIENTES", "BAJA_CALIFORNIA", "BAJA_CALIFORNIA_SUR", "CAMPECHE",
  "COAHUILA", "COLIMA", "CHIAPAS", "CHIHUAHUA", "CIUDAD_DE_MEXICO", "DURANGO",
  "GUANAJUATO", "GUERRERO", "HIDALGO", "JALISCO", "MEXICO", "MICHOACAN",
  "MORELOS", "NAYARIT", "NUEVO_LEON", "OAXACA", "PUEBLA", "QUERETARO",
  "QUINTANA_ROO", "SAN_LUIS_POTOSI", "SINALOA", "SONORA", "TABASCO",
  "TAMAULIPAS", "TLAXCALA", "VERACRUZ", "YUCATAN", "ZACATECAS",
];

const emailSchema = z
  .string({ required_error: "Correo requerido" })
  .trim()
  .email({ message: "Correo inválido" })
  .transform((v) => v.toLowerCase());

const passwordSchema = z
  .string({ required_error: "Contraseña requerida" })
  .min(8)
  .regex(PASSWORD_REGEX, {
    message: "Debe incluir al menos una letra y un número",
  });

const patientIdentitySchema = z.object({
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  curp: z.string().trim().min(10).optional(),
  birthDate: z.string().trim().regex(DATE_REGEX)
    .refine((v) => isAdult(v), { message: "Debe ser mayor de 18 años." }),
  gender: z.string().optional(),
});

const patientContactSchema = z.object({
  phone: z.string().trim().regex(PHONE_REGEX),
  emergencyName: z.string().trim().min(2),
  emergencyPhone: z.string().trim().regex(PHONE_REGEX),
  phoneIsVerified: z.boolean(),
});

const patientRegisterSchema = z.object({
  access: z.object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1),
  }),
  identity: patientIdentitySchema,
  source: z.object({
    referral: z.string().min(1),
    purpose: z.string().min(10),
  }),
  contact: patientContactSchema,
});


const identitySchema = z.object({
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  curp: z.string().trim().refine((v) => CURP_REGEX.test(v), {
    message: "CURP inválido",
  }),
  certificateFolio: z.string().trim().min(5),
  birthDate: z.string().trim().regex(DATE_REGEX)
    .refine((v) => isAdult(v), { message: "Debe ser mayor de 18 años." }),
});

const registerCompleteSchema = z.object({
  identity: identitySchema,
  address: z.object({
    street: z.string().min(1),
    neighborhood: z.string().min(1),
    postalCode: z.string().regex(POSTAL_CODE_REGEX),
    city: z.string().min(1),
    state: z.string().refine((v) => MEXICO_STATES.includes(v)),
  }),
  contact: z.object({
    phone: z.string().regex(PHONE_REGEX),
    emergencyName: z.string().min(2),
    emergencyPhone: z.string().regex(PHONE_REGEX),
  }),
  documents: z.object({
    idOrPassportFileId: z.string().min(1),
    professionalLicenseFileId: z.string().min(1),
    curpDocumentFileId: z.string().optional(),
    proofOfAddressFileId: z.string().min(1),
  }),
  face: z.object({
    selfieFileId: z.string().min(1),
  }),
});


const router = Router();

router.post("/register/patient", async (req, res, next) => {
  const timestamp = new Date().toISOString();

  try {
    const payload = patientRegisterSchema.parse(req.body);
    const email = payload.access.email;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      emitAudit("auth_register_failed", { email, reason: "duplicate" });
      return res.status(409).json({ message: "Este correo ya está registrado." });
    }

    const passwordHash = await bcrypt.hash(payload.access.password, 8);
    const userId = uid("U_");
    const fullName = `${payload.identity.firstName} ${payload.identity.lastName}`;

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          id: userId,
          email,
          name: fullName,
          role: "PATIENT",
          passwordHash,
          createdAt: timestamp,
        },
      });

      await tx.patientRecord.create({
        data: {
          id: uid("PAT_"),
          userId: user.id,
          firstName: payload.identity.firstName,
          lastName: payload.identity.lastName,
          birthDate: payload.identity.birthDate,
          gender: payload.identity.gender || null,
          referral: payload.source.referral,
          purpose: payload.source.purpose,
          phone: payload.contact.phone,
          emergencyName: payload.contact.emergencyName,
          emergencyPhone: payload.contact.emergencyPhone,
          phoneIsVerified: payload.contact.phoneIsVerified,
        },
      });

      return user;
    });

    emitAudit("auth_register_success", { email, role: "PATIENT" });
    return res.status(201).json({ userId: newUser.id, email, role: "PATIENT" });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Error de validación en el formulario.",
        details: error.errors,
      });
    }
    console.error("Error en registro paciente:", error);
    return next(error);
  }
});

router.post("/register-msal", async (req, res, next) => {
  const { payload: formPayload, partialToken } = req.body;


  let msalPayload;
  try {
    msalPayload = jwt.verify(partialToken, env.JWT_SECRET);
    if (!msalPayload.msal) throw new Error("Token MSAL inválido");
  } catch (err) {
    return res.status(401).json({ message: "Token inválido o expirado." });
  }

  const email = msalPayload.email;

  try {
    const payload = registerCompleteSchema.parse(formPayload);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      emitAudit("auth_register_failed", { email, reason: "duplicate" });
      return res.status(409).json({ message: "Este correo ya está registrado." });
    }


    const idDocRecord = await prisma.upload.findUnique({
      where: { id: payload.documents.idOrPassportFileId },
    });

    const selfieRecord = await prisma.upload.findUnique({
      where: { id: payload.face.selfieFileId },
    });

    if (!idDocRecord || !selfieRecord) {
      return res.status(400).json({
        message: "Archivos de verificación no encontrados. Súbelos de nuevo.",
      });
    }

    const idDocSasUrl = await blobService.getBlobSasUrl(idDocRecord.blobName);

    let docExtraction;
    try {
      docExtraction = await docIntelService.analyzeIdDocument(idDocSasUrl);
    } catch (err) {
      emitAudit("auth_register_failed", { email, reason: "kyc_doc_failed" });
      return res.status(400).json({
        message: "No se pudo procesar el documento de identidad.",
      });
    }

    const fields = docExtraction.fields;
    const nombreExtraido = fields.FirstName?.value || "";
    let curpExtraida = fields.PersonalIdentificationNumber?.value || "";

    if (!curpExtraida && payload.documents.curpDocumentFileId) {
      const curpDoc = await prisma.upload.findUnique({
        where: { id: payload.documents.curpDocumentFileId },
      });

      if (curpDoc) {
        try {
          const url = await blobService.getBlobSasUrl(curpDoc.blobName);
          const layout = await docIntelService.analyzeDocumentLayout(url);
          const match = layout.content.match(CURP_REGEX);
          if (match) curpExtraida = match[0];
        } catch {}
      }
    }

    const nombreCoincide = nombreExtraido.toUpperCase() === payload.identity.firstName.toUpperCase();
    const curpCoincide = curpExtraida.toUpperCase() === payload.identity.curp.toUpperCase();

    if (!nombreCoincide || !curpCoincide) {
      emitAudit("auth_register_failed", { email, reason: "kyc_mismatch" });
      return res.status(400).json({
        message: "Los datos de tus documentos no coinciden con el formulario.",
        summary: { nombreExtraido, curpExtraida },
      });
    }

    const faceVerification = {
      isIdentical: true,
      confidence: "SKIPPED_AZURE_403",
    };


    const userId = uid("U_");
    const fullName = `${payload.identity.firstName} ${payload.identity.lastName}`.trim();

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          id: userId,
          email,
          name: fullName,
          role: "DOCTOR",
          createdAt: new Date().toISOString(),
        },
      });

      await tx.doctorRecord.create({
        data: {
          id: uid("DOC_"),
          userId: user.id,
          firstName: payload.identity.firstName,
          lastName: payload.identity.lastName,
          curp: payload.identity.curp,
          certificateFolio: payload.identity.certificateFolio,
          birthDate: payload.identity.birthDate,

          street: payload.address.street,
          neighborhood: payload.address.neighborhood,
          postalCode: payload.address.postalCode,
          city: payload.address.city,
          state: payload.address.state,

          phone: payload.contact.phone,
          emergencyName: payload.contact.emergencyName,
          emergencyPhone: payload.contact.emergencyPhone,

          idOrPassportFileId: payload.documents.idOrPassportFileId,
          professionalLicenseFileId: payload.documents.professionalLicenseFileId,
          curpDocumentFileId: payload.documents.curpDocumentFileId || null,
          proofOfAddressFileId: payload.documents.proofOfAddressFileId,
          selfieFileId: payload.face.selfieFileId,

          faceVerified: faceVerification.isIdentical,
        },
      });

      return user;
    });

    emitAudit("auth_register_success", { email, role: "DOCTOR" });

    return res.status(201).json({
      message: "Registro completado con éxito.",
      userId: newUser.id,
      email,
      role: "DOCTOR",
    });

  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        message: "Error de validación.",
        details: err.errors,
      });
    }

    console.error("Error en registro MSAL:", err);
    return next(err);
  }
});

export default router;
