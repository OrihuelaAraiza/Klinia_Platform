import { Router } from "express";
import { z } from "zod";
import { uid, pushAuditEvent } from "../store/memory.js"; 
import { prisma } from "../services/dbClient.js"; 
import bcrypt from "bcryptjs";
import {
  patientUpdateSchema,
  patientCreationSchema, 
} from "../validators/patientSchemas.js";


const querySchema = z.object({
  q: z.string().optional().default(""),
  page: z.coerce.number().int().positive().default(1),
  size: z.coerce.number().int().positive().max(100).default(10),
});

const router = Router();


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
    birthDate: patientRecord.birthDate,
    emergencyName: patientRecord.emergencyName,
    emergencyPhone: patientRecord.emergencyPhone,
    
    attachments: [], 
    createdAt: patientRecord.createdAt,
    updatedAt: patientRecord.updatedAt,
  };
}


// --- 1. GET / (Obtener Lista y Buscar) ---
router.get("/", 
    async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message || "Parámetros inválidos" });
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

console.log("[DEBUG] Searching Patients with:", JSON.stringify(whereClause));
  try {
    const total = await prisma.patientRecord.count({ where: whereClause });

    const records = await prisma.patientRecord.findMany({
      where: whereClause,
      include: { user: true },
      skip,
      take: size,
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      items: records.map(normalizePatientOutput),
      page,
      size,
      total,
    });
  } catch (error) {
    console.error("[Patients] List error:", error);
    return res.status(500).json({ message: "Error al consultar pacientes" });
  }
});

router.post("/", 
    async (req, res) => {
    
    const parsed = patientCreationSchema.safeParse(req.body); 
    if (!parsed.success) {
        return res.status(400).json({ 
            message: parsed.error.issues[0]?.message || "Datos inválidos" 
        });
    }

    const { email, firstName, lastName, curp, phone, birthDate, gender, referral, purpose, emergencyName, emergencyPhone } = parsed.data;

    try {
        const newRecord = await prisma.$transaction(async (tx) => {
            
            const existingUser = await tx.user.findUnique({
                where: { email: email.toLowerCase() },
            });

            if (existingUser) {
                return res.status(409).json({ message: "Email ya registrado." }); 
            }

            const tempPasswordHash = await bcrypt.hash(uid(10), 8); 
            const userId = uid("U_");
            const fullName = `${firstName} ${lastName}`.trim();
            const timestamp = new Date().toISOString();


            const user = await tx.user.create({
                data: {
                    id: userId,
                    email: email.toLowerCase(),
                    name: fullName,
                    passwordHash: tempPasswordHash, 
                    role: 'PATIENT', 
                    createdAt: timestamp,
                },
            });

            const patient = await tx.patientRecord.create({
                data: {
                    id: uid("PAT_"),
                    userId: user.id,
                    firstName: firstName,
                    lastName: lastName,
                    curp: curp ? curp.toUpperCase() : null,
                    birthDate: birthDate,
                    gender: gender || null,
                    referral: referral, 
                    purpose: purpose,   
                    phone: phone,
                    emergencyName: emergencyName,
                    emergencyPhone: emergencyPhone,
                    phoneIsVerified: false, 
                },
                include: { user: true }
            });
            
            return patient;
        });

        return res.status(201).json(normalizePatientOutput(newRecord));

    } catch (error) {
        if (error instanceof z.ZodError) {
             return res.status(400).json({
                message: "Error de validación en el formulario.",
                details: error.errors,
             });
        }
        // Si el 409 se retorna desde el catch, no es necesario hacer nada aquí.
        console.error("[Patients] Creation error by Therapist:", error);
        return res.status(500).json({ message: "Error al registrar paciente" });
    }
});

// --- 3. GET /:id (Obtener Detalle) ---
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

// --- 4. PUT /:id (Actualizar Paciente) ---
router.put("/:id", async (req, res) => {
  const patientRecordId = req.params.id; 
    const parsed = patientUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message || "Datos inválidos",
    });
  }

  const updates = parsed.data;
  
  try {
    const existing = await prisma.patientRecord.findUnique({
      where: { id: patientRecordId },
      include: { user: true },
    });

    if (!existing) {
      return res.status(404).json({ message: "Patient not found" });
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

    const userData = {};
    const patientRecordData = {};

    if (updates.email !== undefined) {
      userData.email = updates.email.toLowerCase();
    }
    
    if (updates.firstName !== undefined || updates.lastName !== undefined) {
      const newFirstName = updates.firstName ?? existing.firstName; 
      const newLastName = updates.lastName ?? existing.lastName;
      userData.name = `${newFirstName} ${newLastName}`.trim(); 
      patientRecordData.firstName = newFirstName;
      patientRecordData.lastName = newLastName;
    }

    if (updates.curp !== undefined) patientRecordData.curp = updates.curp.toUpperCase();
    if (updates.birthDate !== undefined) patientRecordData.birthDate = updates.birthDate;
    if (updates.phone !== undefined) patientRecordData.phone = updates.phone;
    if (updates.emergencyName !== undefined) patientRecordData.emergencyName = updates.emergencyName;
    if (updates.emergencyPhone !== undefined) patientRecordData.emergencyPhone = updates.emergencyPhone;
    if (updates.gender !== undefined) patientRecordData.gender = updates.gender;

    const updatedRecords = await prisma.$transaction(async (tx) => {

      if (Object.keys(userData).length > 0) {
        await tx.user.update({
          where: { id: existing.userId },
          data: userData,
        });
      }
      
      const updatedPatientRecord = await tx.patientRecord.update({
        where: { id: patientRecordId },
        data: patientRecordData,
        include: { user: true }
      });

      return updatedPatientRecord;
    });

    pushAuditEvent({ event: "patient_update", meta: { id: existing.id }, at: updatedRecords.updatedAt });
    
    return res.json(normalizePatientOutput(updatedRecords));
  } catch (error) {
    console.error("[Patients] Update error:", error);
    return res.status(500).json({ message: "Error al actualizar paciente" });
  }
});

export default router;