import { Router } from "express";
import { z } from "zod";
import { patients, uid, pushAuditEvent } from "../store/memory.js";
import {
  patientCreateSchema,
  patientUpdateSchema,
} from "../validators/patientSchemas.js";

const querySchema = z.object({
  q: z.string().optional().default(""),
  page: z.coerce.number().int().positive().default(1),
  size: z.coerce.number().int().positive().max(100).default(10),
});

const router = Router();

function normalizeAttachments(attachments = []) {
  return attachments.map((file) => ({
    id: file.id || uid("att_"),
    name: file.name,
    type: file.type.toUpperCase(),
    size: file.size,
  }));
}

function normalizePatientOutput(patient) {
  return {
    ...patient,
    attachments: [...(patient.attachments ?? [])],
  };
}

router.get("/", (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message || "Parámetros inválidos" });
  }

  const { q, page, size } = parsed.data;
  const pageNumber = Number(page);
  const pageSize = Number(size);
  const search = q.toLowerCase();
  const allPatients = Array.from(patients.values());

  const filtered = search
    ? allPatients.filter((patient) => {
        return [
          patient.firstName,
          patient.lastName,
          patient.curp,
          patient.email,
        ]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(search));
      })
    : allPatients;

  const total = filtered.length;
  const start = (pageNumber - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize).map(normalizePatientOutput);

  res.json({ items, page: pageNumber, size: pageSize, total });
});

router.post("/", (req, res) => {
  const parsed = patientCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ message: parsed.error.issues[0]?.message || "Datos inválidos" });
  }

  const payload = parsed.data;
  const curpKey = payload.curp.toUpperCase();
  const emailKey = payload.email.toLowerCase();

  const duplicateCurp = Array.from(patients.values()).some(
    (patient) => patient.curp.toUpperCase() === curpKey
  );
  if (duplicateCurp) {
    return res.status(409).json({ message: "CURP ya registrado" });
  }

  const duplicateEmail = Array.from(patients.values()).some(
    (patient) => patient.email.toLowerCase() === emailKey
  );
  if (duplicateEmail) {
    return res.status(409).json({ message: "Email ya registrado" });
  }

  const now = new Date().toISOString();
  const id = uid("pat_");
  const patient = {
    id,
    curp: curpKey,
    firstName: payload.firstName,
    lastName: payload.lastName,
    birthDate: payload.birthDate,
    sex: payload.sex,
    phone: payload.phone,
    email: emailKey,
    attachments: normalizeAttachments(payload.attachments),
    createdAt: now,
    updatedAt: now,
  };

  patients.set(id, patient);
  pushAuditEvent({ event: "patient_create", meta: { id, curp: curpKey }, at: now });

  res.status(201).json(normalizePatientOutput(patient));
});

router.get("/:id", (req, res) => {
  const patient = patients.get(req.params.id);
  if (!patient) {
    return res.status(404).json({ message: "Patient not found" });
  }
  res.json(normalizePatientOutput(patient));
});

router.put("/:id", (req, res) => {
  const existing = patients.get(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: "Patient not found" });
  }

  const parsed = patientUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ message: parsed.error.issues[0]?.message || "Datos inválidos" });
  }

  const updates = parsed.data;

  if (updates.curp) {
    const curpKey = updates.curp.toUpperCase();
    const duplicateCurp = Array.from(patients.values()).some(
      (patient) => patient.id !== existing.id && patient.curp.toUpperCase() === curpKey
    );
    if (duplicateCurp) {
      return res.status(409).json({ message: "CURP ya registrado" });
    }
    existing.curp = curpKey;
  }

  if (updates.email) {
    const emailKey = updates.email.toLowerCase();
    const duplicateEmail = Array.from(patients.values()).some(
      (patient) => patient.id !== existing.id && patient.email.toLowerCase() === emailKey
    );
    if (duplicateEmail) {
      return res.status(409).json({ message: "Email ya registrado" });
    }
    existing.email = emailKey;
  }

  if (updates.firstName !== undefined) existing.firstName = updates.firstName;
  if (updates.lastName !== undefined) existing.lastName = updates.lastName;
  if (updates.birthDate !== undefined) existing.birthDate = updates.birthDate;
  if (updates.sex !== undefined) existing.sex = updates.sex;
  if (updates.phone !== undefined) existing.phone = updates.phone;
  if (updates.attachments !== undefined) {
    existing.attachments = normalizeAttachments(updates.attachments);
  }

  existing.updatedAt = new Date().toISOString();

  patients.set(existing.id, existing);
  pushAuditEvent({ event: "patient_update", meta: { id: existing.id }, at: existing.updatedAt });

  res.json(normalizePatientOutput(existing));
});

export default router;
