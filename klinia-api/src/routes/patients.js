import { Router } from "express";
import { z } from "zod";
import { uid, pushAuditEvent } from "../store/memory.js";
import { prisma } from "../services/dbClient.js";

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
    type: file.type?.toUpperCase(),
    size: file.size,
  }));
}

function normalizePatientOutput(record) {
  if (!record) return null;

  const { user, ...patientRecord } = record;

  return {
    id: patientRecord.id,
    userId: user.id,

    email: user.email,
    name: user.name, 

    curp: patientRecord.curp,
    firstName: patientRecord.firstName,
    lastName: patientRecord.lastName,
    phone: patientRecord.phone,
    attachments: [],

    birthDate: patientRecord.birthDate,
    emergencyName: patientRecord.emergencyName,
    emergencyPhone: patientRecord.emergencyPhone,

    createdAt: patientRecord.createdAt,
    updatedAt: patientRecord.updatedAt,
  };
}

router.get("/", async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ message: parsed.error.issues[0]?.message || "Parámetros inválidos" });
  }

  const { q, page, size } = parsed.data;

  const search = q.toLowerCase();
  const skip = (page - 1) * size;

  const whereClause = search
    ? {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { curp: { contains: search, mode: "insensitive" } },
          { user: { email: { contains: search, mode: "insensitive" } } },
        ],
      }
    : {};

  try {
    const total = await prisma.patientRecord.count({ where: whereClause });

    const records = await prisma.patientRecord.findMany({
      where: whereClause,
      include: { user: true },
      skip,
      take: size,
      orderBy: { createdAt: "desc" },
    });

    const items = records.map(normalizePatientOutput);

    return res.json({
      items,
      page,
      size,
      total,
    });
  } catch (error) {
    console.error("[Patients] List error:", error);
    return res.status(500).json({ message: "Error al consultar pacientes" });
  }
});


router.post("/", async (req, res) => {
  return res
    .status(501)
    .json({ message: "Use /auth/register/patient para crear pacientes." });
});


router.get("/:id", async (req, res) => {
  try {
    const record = await prisma.patientRecord.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });

    if (!record) {
      return res.status(404).json({ message: "Patient not found" });
    }

    return res.json(normalizePatientOutput(record));
  } catch (error) {
    console.error("[Patients] Detail error:", error);
    return res.status(500).json({ message: "Error al obtener paciente" });
  }
});

router.put("/:id", async (req, res) => {
  const parsed = patientUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message || "Datos inválidos",
    });
  }

  const updates = parsed.data;

  try {
    const existing = await prisma.patientRecord.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });

    if (!existing) {
      return res.status(404).json({ message: "Patient not found" });
    }


    if (updates.curp) {
      const duplicate = await prisma.patientRecord.findFirst({
        where: {
          curp: updates.curp.toUpperCase(),
          NOT: { id: existing.id },
        },
      });
      if (duplicate) {
        return res.status(409).json({ message: "CURP ya registrado" });
      }
    }

    if (updates.email) {
      const duplicateEmail = await prisma.user.findFirst({
        where: {
          email: updates.email.toLowerCase(),
          NOT: { id: existing.userId },
        },
      });
      if (duplicateEmail) {
        return res.status(409).json({ message: "Email ya registrado" });
      }
    }

    if (updates.email || updates.firstName || updates.lastName) {
      await prisma.user.update({
        where: { id: existing.userId },
        data: {
          email: updates.email?.toLowerCase() ?? undefined,
          name:
            updates.firstName || updates.lastName
              ? `${updates.firstName ?? existing.firstName} ${
                  updates.lastName ?? existing.lastName
                }`
              : undefined,
        },
      });
    }

    const updatedPatient = await prisma.patientRecord.update({
      where: { id: existing.id },
      data: {
        curp: updates.curp?.toUpperCase(),
        firstName: updates.firstName,
        lastName: updates.lastName,
        phone: updates.phone,
        birthDate: updates.birthDate,
        emergencyName: updates.emergencyName,
        emergencyPhone: updates.emergencyPhone,
        updatedAt: new Date().toISOString(),
      },
      include: { user: true },
    });

    pushAuditEvent({
      event: "patient_update",
      meta: { id: existing.id },
      at: updatedPatient.updatedAt,
    });

    return res.json(normalizePatientOutput(updatedPatient));
  } catch (error) {
    console.error("[Patients] Update error:", error);
    return res.status(500).json({ message: "Error al actualizar paciente" });
  }
});

export default router;
