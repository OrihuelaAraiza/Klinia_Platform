import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../services/dbClient.js";

const SEED_USERS = [
  {
    email: "dev@klinialabs.mx",
    name: "Dev Admin",
    role: "ADMIN",
    password: "DevPass123",
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

export default ensureSeedUsers;
