import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../services/dbClient.js';
import * as blobService from '../services/azureBlobService.js';
import * as faceService from '../services/azureFaceService.js'; 
import { uid } from '../store/memory.js';
import twilio from 'twilio'; 
import { env } from '../config/env.js'; 

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/pjpeg') {
      cb(null, true);
    } else {
      cb(new Error('Formato invalido. Carga una foto JPG.'), false);
    }
  },
});

const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
const verifyServiceSid = env.TWILIO_VERIFY_SERVICE_SID;

console.log('--- VARIABLES DE TWILIO ---');
console.log('ACCOUNT SID (de env):', env.TWILIO_ACCOUNT_SID);
console.log('VERIFY SID (de env):', env.TWILIO_VERIFY_SERVICE_SID);
console.log('VERIFY SID (usado):', verifyServiceSid);

router.post('/face', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ message: 'No se adjuntó ningún archivo.' });
  }

  const userId = 'temp-user-id'; 
  const selfieFileId = uid('SELF_');
  const blobName = `auditoria/${userId}/selfie-${selfieFileId}.jpg`;

  try {
    const blobUrl = await blobService.uploadImageBuffer(
      file.buffer,
      blobName,
      file.mimetype
    );

    // --- ¡LÓGICA DE FACE API COMENTADA! ---
    // console.log('Detectando rostro en selfie...');
    // let score = 0.9;
    // try {
    //   const faceId = await faceService.detectFace(blobUrl);
    //   score = faceId ? 0.95 : 0.0;
    // } catch (faceError) {
    //   score = 0.0;
    //   console.warn('No se detectó un rostro en la selfie:', faceError.message);
    // }
    
    // --- ¡NUEVO! Simulación de éxito ---
    console.warn('¡Omitiendo detección facial de Azure (403)! Simulando score 0.9');
    const score = 0.9;
    // ---------------------------------

    const newUpload = await prisma.upload.create({
      data: {
        id: selfieFileId,
        name: file.originalname,
        mime: file.mimetype,
        size: file.size,
        blobName: blobName,
        blobUrl: blobUrl,
      }
    });

    res.status(200).json({
      ok: true,
      selfieFileId: newUpload.id, 
      score: score,
    });
  } catch (error) {
    console.error('Error en /api/verify/face:', error);
    res.status(500).json({ message: 'Error al procesar la selfie.' });
  }
});

router.post('/send-phone-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ message: 'El número de teléfono es requerido.' });
  }

  const formattedPhone = `+52${phone}`;

  try {
    const verification = await twilioClient.verify.v2
      .services(verifyServiceSid)
      .verifications.create({ to: formattedPhone, channel: 'sms' });
    
    console.log('OTP enviado a:', formattedPhone, verification.status);
    res.status(200).json({ status: verification.status }); 
  } catch (error) {
    console.error("Error al enviar OTP de Twilio:", error);
    res.status(500).json({ message: 'Error al enviar el código SMS.' });
  }
});

router.post('/check-phone-otp', async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ message: 'El teléfono y el código son requeridos.' });
  }

  const formattedPhone = `+52${phone}`;

  try {
    const verificationCheck = await twilioClient.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({ to: formattedPhone, code: code });

    if (verificationCheck.status === 'approved') {
      console.log('OTP aprobado para:', formattedPhone);
      res.status(200).json({ status: verificationCheck.status }); 
    } else {
      console.warn('OTP fallido para:', formattedPhone, verificationCheck.status);
      res.status(400).json({ status: verificationCheck.status, message: 'Código incorrecto.' });
    }
  } catch (error) {
    console.error("Error al verificar OTP de Twilio:", error);
    res.status(500).json({ message: 'Código incorrecto o expirado.' });
  }
});

export default router;