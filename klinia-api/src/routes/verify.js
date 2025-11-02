import { Router } from "express";
import multer from "multer";
import { pushAuditEvent, uid, uploadsById } from "../store/memory.js";

const router = Router();

const ACCEPTED_MIME = new Set(["image/jpeg", "image/pjpeg"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MIN_SELFIE_SIZE = 20 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ACCEPTED_MIME.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    const error = new Error("Formato invalido. Carga una foto JPG.");
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

router.post("/face", (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          message: "Archivo demasiado grande para verificacion facial.",
        });
      }
      const status = err.status || 400;
      return res
        .status(status)
        .json({ message: err.message || "No pudimos procesar la imagen." });
    }

    const file = req.file;
    if (!file) {
      emitAudit("face_verify", { ok: false, score: 0 });
      return res
        .status(400)
        .json({ message: "Adjunta una selfie en formato JPG." });
    }

    if (file.size <= MIN_SELFIE_SIZE) {
      emitAudit("face_verify", { ok: false, score: 0 });
      return res.status(400).json({ message: "No face detected (mock)" });
    }

    const selfieFileId = uid("SELF_");
    const score = 0.9;
    uploadsById.set(selfieFileId, {
      id: selfieFileId,
      name: file.originalname,
      mime: file.mimetype,
      size: file.size,
      buffer: file.buffer,
      uploadedAt: new Date().toISOString(),
      type: "selfie",
      score,
    });

    emitAudit("face_verify", { ok: true, score });

    return res.status(200).json({
      ok: true,
      selfieFileId,
      score,
    });
  });
});

export default router;
