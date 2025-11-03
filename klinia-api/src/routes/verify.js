import { Router } from 'express';
import multer from 'multer';
import * as blobService from '../services/azureBlobService.js';
import * as faceService from '../services/azureFaceService.js'; 
import { uid, uploadsById } from '../store/memory.js'; // Asegúrate de importar esto

const router = Router();

// Configuración de Multer para la selfie (solo JPG)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/pjpeg') {
      cb(null, true);
    } else {
      cb(new Error('Formato invalido. Carga una foto JPG.'), false);
    }
  },
});

/**
 * POST /api/verify/face
 * Esta es la ruta que tu StepFace.jsx está buscando.
 */
router.post('/face', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ message: 'No se adjuntó ningún archivo.' });
  }

  // TODO: Usar un userId real de la sesión
  const userId = 'temp-user-id';
  const selfieFileId = uid('SELF_'); // Generas un ID único
  const blobName = `auditoria/${userId}/selfie-${selfieFileId}.jpg`;

  try {
    // 1. Subir la imagen al Blob Storage
    const blobUrl = await blobService.uploadImageBuffer(
      file.buffer,
      blobName,
      file.mimetype
    );

    // 2. Validar que hay un rostro
    let score = 0.9; // Puntuación simulada
    try {
      const faceId = await faceService.detectFace(blobUrl);
      score = faceId ? 0.95 : 0.0;
    } catch (faceError) {
      score = 0.0;
      console.warn('No se detectó un rostro en la selfie:', faceError.message);
    }

    // 3. Guardar la referencia en memoria (¡sin el buffer!)
    uploadsById.set(selfieFileId, {
      id: selfieFileId,
      name: file.originalname,
      mime: file.mimetype,
      size: file.size,
      blobUrl: blobUrl, // Guardamos la URL de Azure
      uploadedAt: new Date().toISOString(),
      score: score,
    });

    // 4. Responder al frontend con el formato que espera
    res.status(200).json({
      ok: true,
      selfieFileId: selfieFileId, // Esto es lo que StepFace.jsx guarda
      score: score,
    });
  } catch (error) {
    console.error('Error en /api/verify/face:', error);
    res.status(500).json({ message: 'Error al procesar la selfie.' });
  }
});

export default router;