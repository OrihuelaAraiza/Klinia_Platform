import { Router } from "express";
import { historiesByPatient, uid, pushAuditEvent } from "../store/memory.js";
import { historyCreateSchema } from "../validators/historySchemas.js";

const router = Router({ mergeParams: true });

router.get("/", (req, res) => {
  const history = historiesByPatient.get(req.params.id);
  if (!history) {
    return res.status(404).json({ message: "History not found" });
  }
  return res.json(history);
});

router.post("/", (req, res) => {
  if (historiesByPatient.has(req.params.id)) {
    return res.status(409).json({ message: "History already exists" });
  }

  const parsed = historyCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid data" });
  }

  const now = new Date().toISOString();
  const history = {
    id: uid("hist_"),
    patientId: req.params.id,
    createdAt: now,
    ...parsed.data,
  };

  historiesByPatient.set(req.params.id, history);
  pushAuditEvent({ event: "history_create", meta: { patientId: req.params.id }, at: now });

  return res.status(201).json(history);
});

export default router;
