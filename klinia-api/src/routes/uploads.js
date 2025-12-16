import { Router } from "express";
import multer from "multer";
import { pushAuditEvent, uid } from "../store/memory.js"; 
import { prisma } from '../services/dbClient.js'; 
import * as blobService from '../services/azureBlobService.js'; // ¡Importante!

const router = Router();

const ACCEPTED_MIME = new Set(["application/pdf", "image/jpeg", "image/pjpeg", "image/png", "image/jpg"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

function emitAudit(event, meta = {}) { pushAuditEvent({ event, ...meta }); }

router.post("/", (req, res) => {
  upload.single("file")(req, res, async (err) => { 
    if (err) {
      return res.status(400).json({ error: err.message || "File upload error" });
    }

    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file provided" });
      }

      if (!ACCEPTED_MIME.has(file.mimetype)) {
        return res.status(415).json({ error: "Unsupported media type" });
      }

      const fileId = uid("UPL_");
      // Obtener userId del usuario autenticado, o usar null si no está autenticado
      const userId = req.user?.id || null;
      const blobName = userId 
        ? `profiles/${userId}/profile-picture-${fileId}-${file.originalname}`
        : `auditoria/temp/doc-${fileId}-${file.originalname}`;

      const blobUrl = await blobService.uploadImageBuffer(
        file.buffer,
        blobName,
        file.mimetype
      );

      const newUpload = await prisma.upload.create({
        data: {
          id: fileId,
          name: file.originalname,
          mime: file.mimetype,
          size: file.size,
          blobName: blobName,
          blobUrl: blobUrl,
          userId: userId, // Asociar el upload al usuario si está autenticado
        }
      });

      emitAudit("files_upload", { fileId, blobName });

      return res.status(201).json({
        fileId: newUpload.id,
        name: newUpload.name,
        mime: newUpload.mime,
        size: newUpload.size,
        blobUrl: newUpload.blobUrl,
      });
    } catch (error) {
      console.error("Upload error:", error);
      emitAudit("files_upload_error", { error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  });
});

export default router;