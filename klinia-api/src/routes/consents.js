import { Router } from "express";
import { z } from "zod";
import {
  patients,
  consentsByPatient,
  uid,
  pushAuditEvent,
} from "../store/memory.js";
import { consentTypeSchema } from "../validators/patientSchemas.js";

const router = Router({ mergeParams: true });

const signSchema = z.object({
  type: consentTypeSchema,
  professional: z.string().optional(),
});

const revokeSchema = z.object({
  status: z.literal("revoked"),
});

function getConsentCollection(patientId) {
  if (!consentsByPatient.has(patientId)) {
    consentsByPatient.set(patientId, []);
  }
  return consentsByPatient.get(patientId);
}

function ensurePatient(req, res) {
  const patient = patients.get(req.params.id);
  if (!patient) {
    res.status(404).json({ message: "Patient not found" });
    return null;
  }
  return patient;
}

function ensureDefaultConsents(patientId) {
  const collection = getConsentCollection(patientId);
  const byType = new Map(collection.map((item) => [item.type, item]));
  const types = ["attention", "recording", "ai_use"];
  for (const type of types) {
    if (!byType.has(type)) {
      const pending = {
        id: uid("con_"),
        patientId,
        type,
        status: "pending",
        professional: "",
        timestamp: "",
      };
      collection.push(pending);
      byType.set(type, pending);
    }
  }
  return types.map((type) => ({ ...byType.get(type) }));
}

router.get("/", (req, res) => {
  const patient = ensurePatient(req, res);
  if (!patient) {
    return;
  }

  const current = ensureDefaultConsents(patient.id);
  return res.json(current);
});

router.post("/", (req, res) => {
  const patient = ensurePatient(req, res);
  if (!patient) {
    return;
  }

  const parsed = signSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ message: parsed.error.issues[0]?.message || "Datos inválidos" });
  }

  const { type, professional } = parsed.data;
  ensureDefaultConsents(patient.id);
  const storedCollection = getConsentCollection(patient.id);
  const now = new Date().toISOString();
  const existing = storedCollection.find((item) => item.type === type);

  if (existing) {
    existing.status = "signed";
    existing.timestamp = now;
    existing.professional = professional || existing.professional || "Profesional";
    pushAuditEvent({
      event: "consent_update",
      meta: { patientId: patient.id, type, status: "signed" },
      at: now,
    });
    return res.status(201).json(existing);
  }

  const consent = {
    id: uid("con_"),
    patientId: patient.id,
    type,
    status: "signed",
    professional: professional || "Profesional",
    timestamp: now,
  };

  storedCollection.push(consent);
  pushAuditEvent({
    event: "consent_update",
    meta: { patientId: patient.id, type, status: "signed" },
    at: now,
  });
  return res.status(201).json(consent);
});

router.put("/:consentId", (req, res) => {
  const patient = ensurePatient(req, res);
  if (!patient) {
    return;
  }

  const parsed = revokeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ message: parsed.error.issues[0]?.message || "Datos inválidos" });
  }

  const collection = getConsentCollection(patient.id);
  const consent = collection.find((item) => item.id === req.params.consentId);

  if (!consent) {
    return res.status(404).json({ message: "Consent not found" });
  }

  if (consent.status !== "signed") {
    return res.status(400).json({ message: "Solo se puede revocar un consentimiento firmado" });
  }

  consent.status = "revoked";
  consent.timestamp = new Date().toISOString();

  pushAuditEvent({
    event: "consent_update",
    meta: { patientId: patient.id, type: consent.type, status: "revoked" },
    at: consent.timestamp,
  });

  return res.json(consent);
});

export default router;
