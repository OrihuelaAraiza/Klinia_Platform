import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../services/dbClient.js";
import { uid } from "../store/memory.js";

const SEED_USERS = [
  {
    email: "dev@klinialabs.mx",
    name: "Dev Admin",
    role: "ADMIN",
    password: "DevPass123",
  },
  {
    email: "paciente@klinialabs.mx",
    name: "Paciente Demo",
    role: "PATIENT",
    password: "Paciente123",
    patientData: {
      firstName: "Juan",
      lastName: "Pérez",
      curp: "PEPJ900101HDFRRN01",
      birthDate: "1990-01-01",
      gender: "M",
      referral: "Referido por médico general",
      purpose: "Consulta de seguimiento y evaluación de tratamiento",
      phone: "5512345678",
      emergencyName: "María Pérez",
      emergencyPhone: "5512345679",
      phoneIsVerified: true,
    },
  },
];

export async function ensureSeedUsers() {
  for (const user of SEED_USERS) {
    const existing = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (existing) {
      continue;
    }

    if (user.role === "PATIENT" && user.patientData) {
      // Crear usuario paciente con PatientRecord
      const userId = randomUUID();
      const passwordHash = await bcrypt.hash(user.password, 8);

      await prisma.$transaction(async (tx) => {
        // Crear el usuario
        await tx.user.create({
          data: {
            id: userId,
            name: user.name,
            email: user.email,
            role: user.role,
            passwordHash,
          },
        });

        // Crear el PatientRecord
        await tx.patientRecord.create({
          data: {
            id: uid("PAT_"),
            userId: userId,
            firstName: user.patientData.firstName,
            lastName: user.patientData.lastName,
            curp: user.patientData.curp || null,
            birthDate: user.patientData.birthDate,
            gender: user.patientData.gender || null,
            referral: user.patientData.referral,
            purpose: user.patientData.purpose,
            phone: user.patientData.phone,
            emergencyName: user.patientData.emergencyName,
            emergencyPhone: user.patientData.emergencyPhone,
            phoneIsVerified: user.patientData.phoneIsVerified || false,
          },
        });
      });

      console.log(`[seed] Usuario paciente ${user.email} creado para pruebas locales.`);
    } else {
      // Crear usuario normal (ADMIN, PROFESSIONAL, etc.)
      await prisma.user.create({
        data: {
          id: randomUUID(),
          name: user.name,
          email: user.email,
          role: user.role,
          passwordHash: await bcrypt.hash(user.password, 8),
        },
      });

      console.log(`[seed] Usuario ${user.email} creado para pruebas locales.`);
    }
  }
}

export default ensureSeedUsers;
