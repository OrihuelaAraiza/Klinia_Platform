import { PrismaClient } from '@prisma/client'; 

export const prisma = new PrismaClient();

console.log('Cliente de Prisma inicializado y conectado a la BD local.');