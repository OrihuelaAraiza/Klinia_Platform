import { Router } from "express";
import { z } from "zod";
import { pushAuditEvent } from "../store/memory.js";

const auditSchema = z.object({
  event: z.string().min(1, { message: "Evento requerido" }),
  meta: z.record(z.any()).optional().default({}),
  at: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Fecha inválida",
  }),
});

const router = Router();

router.post("/audit", (req, res, next) => {
  try {
    const payload = auditSchema.parse(req.body);
    pushAuditEvent(payload);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
