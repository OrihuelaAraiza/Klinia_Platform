import { Router } from "express";
import { prisma } from '../services/dbClient.js'; 
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  pushAuditEvent,
  uid,
} from "../store/memory.js";

import * as docIntelService from '../services/azureDocIntelService.js';
import * as faceService from '../services/azureFaceService.js';
import * as blobService from '../services/azureBlobService.js';

function emitAudit(event, meta = {}) {
  pushAuditEvent({
    event,
    meta,
    at: new Date().toISOString(),
  });
}

const router = Router();

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const CURP_REGEX =
  /^[A-Z][AEIOU][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HM](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS)[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]\d$/;
const RFC_REGEX = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/;
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


function isAdult(birthDate) {
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
  firstName: z.string().trim().min(2, { message: "Nombre muy corto" }),
  lastName: z.string().trim().min(2, { message: "Apellido muy corto" }),
  curp: z.string().trim().refine((value) => CURP_REGEX.test(value), { message: "CURP invalido" }),
  certificateFolio: z
    .string({ required_error: "Folio de certificado requerido" })
    .trim()
    .min(5, { message: "Folio inválido (mín. 5 caracteres)" }),
  birthDate: z.string().trim().regex(DATE_REGEX, { message: "Fecha invalida" })
    .refine((value) => isAdult(value), { message: "Debe ser mayor de 18 años." }),
});
const registerCompleteSchema = z.object({
  access: z.object({
    email: emailSchema,
    password: passwordSchema,
  }),
  identity: identitySchema,
  address: z.object({
    street: z.string().trim().min(1, { message: "Calle requerida" }),
    neighborhood: z.string().trim().min(1, { message: "Colonia requerida" }),
    postalCode: z.string().trim().regex(POSTAL_CODE_REGEX, { message: "Codigo postal invalido" }),
    city: z.string().trim().min(1, { message: "Ciudad requerida" }),
    state: z.string().trim().min(1, { message: "Estado requerido" }).refine((value) => MEXICO_STATES.includes(value), { message: "Estado invalido" }),
  }),
  contact: z.object({
    phone: z.string().trim().regex(PHONE_REGEX, { message: "Telefono invalido" }),
    emergencyName: z.string().trim().min(2, { message: "Contacto de emergencia invalido" }),
    emergencyPhone: z.string().trim().regex(PHONE_REGEX, { message: "Telefono de emergencia invalido" }),
  }),
  documents: z.object({
    idOrPassportFileId: z.string().trim().min(1, { message: "Identificacion requerida" }),
    professionalLicenseFileId: z.string().trim().min(1, { message: "Cedula requerida" }),
    curpDocumentFileId: z.string().trim().min(1).optional(),
    proofOfAddressFileId: z.string().trim().min(1, { message: "Comprobante requerido" }),
  }),
  face: z.object({
    selfieFileId: z.string().trim().min(1, { message: "Selfie requerida" }),
  }),
});


router.post("/register/complete", async (req, res, next) => {
  const timestamp = new Date().toISOString();
  const emailForAudit = String(req.body?.access?.email || "").trim().toLowerCase();

  try {
    const payload = registerCompleteSchema.parse(req.body);
    const email = payload.access.email;

    const existingUser = await prisma.user.findUnique({
      where: { email: email }
    });
    if (existingUser) {
      emitAudit("auth_register_failed", { email, reason: "duplicate" });
      return res
        .status(409)
        .json({ message: "Este correo ya esta registrado." });
    }

    const idDocFileId = payload.documents.idOrPassportFileId;
    const selfieFileId = payload.face.selfieFileId;
    const idDocRecord = await prisma.upload.findUnique({ where: { id: idDocFileId } });
    const selfieRecord = await prisma.upload.findUnique({ where: { id: selfieFileId } });

    if (!idDocRecord || !selfieRecord) {
      console.error("Registros no encontrados en la BD", { idDocFileId, selfieFileId });
      return res.status(400).json({ message: "Archivos de verificación no encontrados. Súbelos de nuevo." });
    }

    const idDocBlobName = idDocRecord.blobName;
    if (!idDocBlobName) {
      console.error("Registro de 'idDoc' no tiene .blobName", idDocRecord);
      return res.status(400).json({ message: "Registro de archivo corrupto, falta 'blobName'." });
    }
  
    const idDocSasUrl = await blobService.getBlobSasUrl(idDocBlobName);

 
    let docExtraction;
    try {
      console.log('Iniciando verificación de documentos (extracción de texto)...');
      docExtraction = await docIntelService.analyzeIdDocument(idDocSasUrl);
    } catch (extractionError) {
      console.warn('Fallo la extracción de Document Intelligence:', extractionError.message);
      emitAudit("auth_register_failed", { email, reason: "kyc_doc_intel_failed" });
      return res.status(400).json({ 
        message: `El documento de identidad no pudo ser procesado. Asegúrate de que sea una INE válida. (Error: ${extractionError.message})` 
      });
    }

    const fields = docExtraction.fields;
    const nombreExtraido = fields.FirstName?.value || ''; 
    let curpExtraida = fields.PersonalIdentificationNumber?.value || '';


    if (!curpExtraida && payload.documents.curpDocumentFileId) {
    }


    const nombreCoincide = (nombreExtraido?.toUpperCase() || '') === (payload.identity.firstName?.toUpperCase() || '');
    const curpCoincide = (curpExtraida?.toUpperCase() || '') === (payload.identity.curp?.toUpperCase() || '');

    console.warn('¡Omitiendo verificación facial! ...');
    const faceVerification = { isIdentical: true, confidence: "SKIPPED_AZURE_403" };   
    const verificationSummary = {
      nombreCoincide,
      curpCoincide,
      faceVerification, // ej: { isIdentical: true, confidence: "SKIPPED_AZURE_403" }
      datosFormulario: {
        nombre: payload.identity.firstName,
        curp: payload.identity.curp,
      },
      datosExtraidos: { 
        nombre: nombreExtraido, 
        curp: curpExtraida 
      },
    };

    if (!nombreCoincide || !curpCoincide) { 
      console.warn('Verificación de TEXTO fallida para:', email, verificationSummary);
      emitAudit("auth_register_failed", {
        email,
        reason: "kyc_text_failed",
        summary: verificationSummary,
      });

      return res.status(400).json({ 
        message: 'Los datos de tus documentos (CURP/Nombre) no coinciden con el formulario.', 
        summary: verificationSummary 
      });
    }
    
    console.log('Verificación de texto exitosa. Creando usuario...');
    const passwordHash = await bcrypt.hash(payload.access.password, 8);
    const userId = uid("U_");
    const fullName = `${payload.identity.firstName} ${payload.identity.lastName}`.trim();

    const allFileIds = [
      payload.documents.idOrPassportFileId,
      payload.documents.professionalLicenseFileId,
      payload.documents.curpDocumentFileId,
      payload.documents.proofOfAddressFileId,
      payload.face.selfieFileId
    ].filter(Boolean);
   
    try { 
      const newUser = await prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            id: userId,
            email: email,
            name: fullName,
            role: "PROFESSIONAL",
            passwordHash: passwordHash,
            createdAt: timestamp,
          }
        });

      await tx.kycRecord.create({
          data: {
            id: uid("KYC_"),
            userId: createdUser.id,
            firstName: payload.identity.firstName,
            lastName: payload.identity.lastName,
            curp: payload.identity.curp,
            birthDate: payload.identity.birthDate,
            certificateFolio: payload.identity.certificateFolio, 
            phone: payload.contact.phone,
            street: payload.address.street,
            neighborhood: payload.address.neighborhood,
            postalCode: payload.address.postalCode,
            city: payload.address.city,
            state: payload.address.state,
            nombreCoincide: verificationSummary.nombreCoincide, 
            curpCoincide: verificationSummary.curpCoincide,   
            faceConfidence: String(verificationSummary.faceVerification.confidence) // ej: "SKIPPED_AZURE_403"
          }
        });
        
        await tx.upload.updateMany({
          where: {
            id: { in: allFileIds }
          },
          data: {
            userId: createdUser.id
          }
        });

        return createdUser;
      });

      const responseBody = {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
      };
      emitAudit("auth_register_success", responseBody);
      return res.status(201).json(responseBody);

    } catch (dbError) { 
      console.error("Error en la transacción de Prisma:", dbError);
      emitAudit("auth_register_failed", {
        email: emailForAudit,
        reason: "database_error",
        message: dbError?.message,
      });
      return res.status(500).json({ message: "Error al guardar el usuario en la base de datos." });
    }
    
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