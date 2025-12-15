import { Router } from "express";
import { z } from "zod";
import { prisma } from "../services/dbClient.js";
import bcrypt from "bcryptjs";
import { uid } from "../store/memory.js"; 

const MAX_DELEGATES = 5;

function getProfessionalId(req) {
    return req.user?.id || null; 
}

// Esquemas Zod para delegados
const delegateCreationSchema = z.object({
    username: z.string().email("Debe ser un email válido para el asistente.").trim(),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

const router = Router();


// --- RUTA 1: GET /api/delegates (Listar Asistentes) ---
router.get("/", async (req, res) => {
    const professionalId = getProfessionalId(req);
    if (!professionalId) return res.status(401).json({ message: "Autenticación requerida." });

    try {
        const delegates = await prisma.user.findMany({
            where: {
                delegatedById: professionalId,
                role: 'ASSISTANT',
            },
            select: { id: true, email: true, name: true, createdAt: true }, 
        });
        return res.json(delegates);
    } catch (e) {
        console.error("[Delegates] List Error:", e);
        return res.status(500).json({ message: "Error al listar asistentes." });
    }
});

// --- RUTA 2: POST /api/delegates (Crear Asistente) ---
router.post("/", async (req, res) => {
    const professionalId = getProfessionalId(req);
    if (!professionalId) return res.status(401).json({ message: "Autenticación requerida." });

    const currentDelegatesCount = await prisma.user.count({
        where: { delegatedById: professionalId, role: 'ASSISTANT' },
    });

    if (currentDelegatesCount >= MAX_DELEGATES) {
        return res.status(403).json({ message: `Ha alcanzado el límite de ${MAX_DELEGATES} asistentes delegados.` });
    }

    const parsed = delegateCreationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Datos de asistente inválidos." });

    const { username: email, password } = parsed.data;

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ message: "El correo electrónico ya está en uso." });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const newDelegate = await prisma.user.create({
            data: {
                id: uid("U_"),
                email,
                name: `Asistente de ${professionalId}`, 
                role: 'ASSISTANT',
                passwordHash,
                delegatedById: professionalId, 
            },
            select: { id: true, email: true, name: true, createdAt: true },
        });

        return res.status(201).json(newDelegate);
    } catch (e) {
        console.error("[Delegates] Creation Error:", e);
        return res.status(500).json({ message: "Error al crear el perfil del asistente." });
    }
});

// --- RUTA 3: DELETE /api/delegates/:id (Eliminar Asistente) ---
router.delete("/:id", async (req, res) => {
    const professionalId = getProfessionalId(req);
    const delegateId = req.params.id;

    if (!professionalId) return res.status(401).json({ message: "Autenticación requerida." });

    try {
        const delegate = await prisma.user.findUnique({
            where: { id: delegateId, delegatedById: professionalId, role: 'ASSISTANT' },
        });

        if (!delegate) {
            return res.status(403).json({ message: "Acceso denegado o asistente no encontrado." });
        }

        await prisma.user.delete({
            where: { id: delegateId },
        });

        return res.status(204).send();
    } catch (e) {
        console.error("[Delegates] Delete Error:", e);
        return res.status(500).json({ message: "Error al eliminar el asistente." });
    }
});

export default router;