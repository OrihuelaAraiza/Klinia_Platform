import { Router } from "express";
import { z } from "zod";
import { prisma } from "../services/dbClient.js";
import { uid } from "../store/memory.js";

const router = Router();

function getProfessionalId(req) {
    return req.user?.id; 
}

/**
 * Verifica si el paciente está bajo el cuidado del profesional autenticado.
 */
async function checkPatientOwnership(patientId, professionalId) {
    if (!patientId || !professionalId) return false;

    const patient = await prisma.patientRecord.findUnique({
        where: { id: patientId, professionalInChargeId: professionalId },
        select: { id: true },
    });

    return !!patient;
}

// --- ESQUEMAS ZOD ---

const orderCreateSchema = z.object({
    patientId: z.string().trim().min(1),
    tipo: z.string().trim().min(1),
    descripcion: z.string().trim().min(1),
    indicaciones: z.string().trim().nullable().optional(),
});

const orderUpdateSchema = orderCreateSchema.partial();

const orderIdSchema = z.string().min(1);

// --- RUTA 1: POST / (Crear Orden) ---
router.post("/", async (req, res) => {
    const professionalId = getProfessionalId(req);
    if (!professionalId) return res.status(401).json({ message: "Autenticación requerida." });

    const parsed = orderCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Datos de orden inválidos." });

    const { patientId, ...data } = parsed.data;

    if (!(await checkPatientOwnership(patientId, professionalId))) {
        return res.status(403).json({ message: "No tienes permiso para crear órdenes para este paciente." });
    }

    try {
        const record = await prisma.order.create({
            data: {
                ...data,
                id: uid("ORD_"),
                folio: uid("ORD-"),
                patientId: patientId,
                professionalId: professionalId,
                status: "vigente", 
            },
        });
        return res.status(201).json(record);
    } catch (e) {
        console.error("[Orders] Create Error:", e);
        return res.status(500).json({ message: "Error al crear la orden." });
    }
});

// --- RUTA 2: GET /:id (Obtener Detalle) ---
router.get("/:id", async (req, res) => {
    const orderId = req.params.id;
    const professionalId = getProfessionalId(req);
    if (!professionalId) return res.status(401).json({ message: "Autenticación requerida." });

    try {
        const record = await prisma.order.findUnique({
            where: { id: orderId, professionalId: professionalId },
        });

        if (!record) {
            return res.status(404).json({ message: "Orden no encontrada o sin permisos." });
        }
        
        return res.json(record);
    } catch (e) {
        console.error("[Orders] Get Detail Error:", e);
        return res.status(500).json({ message: "Error al obtener la orden." });
    }
});


// --- RUTA 3: PUT /:id (Actualizar Orden) ---
router.put("/:id", async (req, res) => {
    const orderId = req.params.id;
    const professionalId = getProfessionalId(req);
    if (!professionalId) return res.status(401).json({ message: "Autenticación requerida." });

    const parsed = orderUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Datos de orden inválidos." });
    const updates = parsed.data;

    try {
        const existingOrder = await prisma.order.findUnique({
            where: { id: orderId, professionalId: professionalId },
        });

        if (!existingOrder) {
            return res.status(404).json({ message: "Orden no encontrada o sin permisos." });
        }
        if (existingOrder.status === 'cancelada') {
             return res.status(400).json({ message: "No se puede editar una orden cancelada." });
        }

        const record = await prisma.order.update({
            where: { id: orderId },
            data: updates,
        });
        return res.json(record);
    } catch (e) {
        console.error("[Orders] Update Error:", e);
        return res.status(500).json({ message: "Error al actualizar la orden." });
    }
});


// --- RUTA 4: POST /:id/cancel (Cancelar Orden) ---
router.post("/:id/cancel", async (req, res) => {
    const orderId = req.params.id;
    const professionalId = getProfessionalId(req);
    if (!professionalId) return res.status(401).json({ message: "Autenticación requerida." });

    try {
        const record = await prisma.order.update({
            where: { id: orderId, professionalId: professionalId, status: "vigente" },
            data: { status: "cancelada" },
        });
        return res.json(record);
    } catch (e) {
        if (e.code === 'P2025') {
             return res.status(404).json({ message: "Orden no encontrada, ya cancelada o sin permisos." });
        }
        console.error("[Orders] Cancel Error:", e);
        return res.status(500).json({ message: "Error al cancelar la orden." });
    }
});



export default router;