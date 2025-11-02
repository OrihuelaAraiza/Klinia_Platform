import { Router } from "express";
import multer from "multer";
import { pushAuditEvent, uid, uploadsById } from "../store/memory.js";

const router = Router();

const ACCEPTED_MIME = new Set(["application/pdf", "image/jpeg", "image/pjpeg"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ACCEPTED_MIME.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    const error = new Error("Formato invalido (solo PDF o JPG).");
    error.status = 400;
    cb(error);
  },
});

function emitAudit(event, meta = {}) {
  pushAuditEvent({
    event,
    meta,
    at: new Date().toISOString(),
  });
}

router.post("/", (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(413)
          .json({ message: "Documento demasiado grande (max 5 MB)." });
      }
      const status = err.status || 400;
      const message =
        err.message || "No pudimos subir el documento. Intenta nuevamente.";
      return res.status(status).json({ message });
    }

    try {
      const file = req.file;

      if (!file) {
        return res
          .status(400)
          .json({ message: "Debes adjuntar un archivo (PDF o JPG)." });
      }

      const fileId = uid("UPL_");
      uploadsById.set(fileId, {
        id: fileId,
        name: file.originalname,
        mime: file.mimetype,
        size: file.size,
        buffer: file.buffer,
        uploadedAt: new Date().toISOString(),
      });

      emitAudit("files_upload", {
        fileId,
        mime: file.mimetype,
        size: file.size,
      });

      return res.status(201).json({
        fileId,
        name: file.originalname,
        mime: file.mimetype,
        size: file.size,
      });
    } catch (unknownError) {
      console.error("[uploads] unexpected error", unknownError);
      return res
        .status(500)
        .json({ message: "No pudimos subir el documento. Intenta nuevamente." });
    }
  });
});

export default router;
