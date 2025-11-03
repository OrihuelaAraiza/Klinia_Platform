import { Router } from "express";
import multer from "multer";
import { pushAuditEvent, uid, uploadsById } from "../store/memory.js";
import * as blobService from '../services/azureBlobService.js'; // ¡Importante!

const router = Router();

const ACCEPTED_MIME = new Set(["application/pdf", "image/jpeg", "image/pjpeg"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  // ... (tu fileFilter está bien)
});

function emitAudit(event, meta = {}) { /* ... */ }

router.post("/", (req, res) => {
  upload.single("file")(req, res, async (err) => { // ¡Convertido a async!
    if (err) {
      // ... (tu manejo de errores está bien)
    }

    try {
      const file = req.file;
      if (!file) {
        // ... (tu manejo de 'no file' está bien)
      }

      const fileId = uid("UPL_");
      // TODO: Usar un userId real de la sesión
      const userId = 'temp-user-id'; 
      const blobName = `auditoria/${userId}/doc-${fileId}-${file.originalname}`;

      // --- ¡LÓGICA NUEVA! ---
      // 1. Subir el buffer a Azure Blob
      const blobUrl = await blobService.uploadImageBuffer(
        file.buffer,
        blobName,
        file.mimetype
      );
      // ---------------------

      // 2. Guardar la referencia en memoria (¡sin el buffer!)
      uploadsById.set(fileId, {
        id: fileId,
        name: file.originalname,
        mime: file.mimetype,
        size: file.size,
        blobUrl: blobUrl, // Guardamos la URL de Azure
        uploadedAt: new Date().toISOString(),
      });

      emitAudit("files_upload", { fileId, mime: file.mimetype, size: file.size, blobUrl });

      // 3. Devolver el fileId (¡tu frontend lo espera!)
      return res.status(201).json({
        fileId, // Esto es lo que StepDocs.jsx guarda en el estado
        name: file.originalname,
        mime: file.mimetype,
        size: file.size,
        blobUrl: blobUrl, // Útil para debug
      });
    } catch (unknownError) {
      console.error("[uploads] unexpected error", unknownError);
      return res.status(500).json({ message: "No pudimos subir el documento." });
    }
  });
});

export default router;