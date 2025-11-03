import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  hasUser,
  kycRecordsByUserId,
  pushAuditEvent, // <-- Asegúrate de que 'pushAuditEvent' esté importado
  uid,
  usersByEmail,
  uploadsById,
} from "../store/memory.js";
import * as docIntelService from '../services/azureDocIntelService.js';
import * as faceService from '../services/azureFaceService.js';


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

router.post("/register/complete", async (req, res, next) => {
  const timestamp = new Date().toISOString();
  const emailForAudit = String(req.body?.access?.email || "").trim().toLowerCase();

  try {
    const payload = registerCompleteSchema.parse(req.body);
    const email = payload.access.email;

    if (hasUser(email)) {
      emitAudit("auth_register_failed", { email, reason: "duplicate" });
      return res
        .status(409)
        .json({ message: "Este correo ya esta registrado." });
    }

    
    const idDocFileId = payload.documents.idOrPassportFileId;
    const selfieFileId = payload.face.selfieFileId;

    const idDocRecord = uploadsById.get(idDocFileId);
    const selfieRecord = uploadsById.get(selfieFileId);

    if (!idDocRecord || !selfieRecord || !idDocRecord.blobUrl || !selfieRecord.blobUrl) {
      return res.status(400).json({ message: "Archivos de verificación no encontrados. Súbelos de nuevo." });
    }

    const idDocUrl = idDocRecord.blobUrl;
    const selfieUrl = selfieRecord.blobUrl;

   
    console.log('Iniciando verificación de documentos y rostros...');
    const [docExtraction, selfieFaceId] = await Promise.all([
      docIntelService.analyzeIdDocument(idDocUrl),
      faceService.detectFace(selfieUrl),
    ]);

 
    const fields = docExtraction.fields;
    const nombreExtraido = fields.FirstName?.value || '';
    const curpExtraida = fields.PersonalIdentificationNumber?.value || '';
    
 
    const nombreCoincide = nombreExtraido.toUpperCase() === payload.identity.firstName.toUpperCase();
    const curpCoincide = curpExtraida.toUpperCase() === payload.identity.curp.toUpperCase();

  
    const docFaceId = await faceService.detectFace(idDocUrl);
    const faceVerification = await faceService.verifyFaces(selfieFaceId, docFaceId);

    const verificationSummary = {
      nombreCoincide,
      curpCoincide,
      faceVerification,
      datosFormulario: {
        nombre: payload.identity.firstName,
        curp: payload.identity.curp,
      },
      datosExtraidos: { 
        nombre: nombreExtraido, 
        curp: curpExtraida 
      },
    };

    if (!nombreCoincide || !curpCoincide || !faceVerification.isIdentical) {
      console.warn('Verificación fallida para:', email, verificationSummary);
      
      emitAudit("auth_register_failed", {
        email,
        reason: "kyc_failed",
        summary: verificationSummary,
      });

      return res.status(400).json({ 
        message: 'Los datos de tus documentos no coinciden con el formulario o tu rostro.', 
        summary: verificationSummary 
      });
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
      verification: verificationSummary, 
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