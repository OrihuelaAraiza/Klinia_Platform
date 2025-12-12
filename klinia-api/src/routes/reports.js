import { Router } from "express";
import { z } from "zod";
import { prisma } from "../services/dbClient.js";
import { uid } from "../store/memory.js";

const router = Router();

function getProfessionalId(req) {
    return req.user?.id; 
}

async function checkPatientOwnership(patientId, professionalId) {
    if (!patientId || !professionalId) return false;

    const patient = await prisma.patientRecord.findUnique({
        where: { id: patientId, professionalInChargeId: professionalId },
        select: { id: true },
    });

    return !!patient;
}

// --- ESQUEMAS ZOD y RUTAS 1, 2, 3, 4 se mantienen iguales ---
const reportContentSchema = z.object({
    patientId: z.string().trim().min(1),
    titulo: z.string().trim().min(1, { message: "El título es requerido." }),
    contenido: z.string().trim().min(1, { message: "El contenido es requerido." }),
});

const reportUpdateSchema = reportContentSchema.partial();


// --- RUTA 1: POST / (Crear Informe) ---
router.post("/", async (req, res) => {
    const professionalId = getProfessionalId(req);
    if (!professionalId) return res.status(401).json({ message: "Autenticación requerida." });
    const parsed = reportContentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Datos de informe inválidos." });

    const { patientId, ...data } = parsed.data;

    if (!(await checkPatientOwnership(patientId, professionalId))) {
        return res.status(403).json({ message: "No tienes permiso para crear informes para este paciente." });
    }

    try {
        const newReport = await prisma.report.create({
            data: {
                id: uid("REP_"),
                folio: uid("INF-"), 
                patientId: patientId,
                professionalId: professionalId,
                titulo: data.titulo,
                contenido: data.contenido,
                status: "borrador", 
            },
        });
        return res.status(201).json(newReport);
    } catch (e) {
        console.error("[Reports] Create DB Error:", e);
        return res.status(500).json({ message: "Error al crear el informe." });
    }
});


// --- RUTA 2: GET /:id (Obtener Detalle) ---
router.get("/:id", async (req, res) => {
    const reportId = req.params.id;
    const professionalId = getProfessionalId(req);
    if (!professionalId) {
        return res.status(401).json({ message: "Autenticación requerida." });
    }

    try {
        const record = await prisma.report.findUnique({
            where: { id: reportId },
            include: {
                patient: { select: { professionalInChargeId: true } }, 
                professional: { select: { id: true, name: true } }, 
            },
        });

        if (!record) {
            return res.status(404).json({ message: "Reporte no encontrado." });
        }
        
        const isOwner = record.professionalId === professionalId;
        const isCaretaker = record.patient.professionalInChargeId === professionalId;
        
        if (!isOwner && !isCaretaker) {
            return res.status(403).json({ message: "Acceso denegado a este informe." });
        }

        const { patient, ...reportData } = record;
        return res.json(reportData); 
        
    } catch (e) {
        console.error("[Reports] Detail DB Error:", e);
        return res.status(500).json({ message: "Error al obtener el detalle del reporte." });
    }
});


// --- RUTA 3: PUT /:id (Actualizar Reporte) ---
router.put("/:id", async (req, res) => {
    const reportId = req.params.id;
    const professionalId = getProfessionalId(req);
    if (!professionalId) {
        return res.status(401).json({ message: "Autenticación requerida." });
    }

    const parsed = reportUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: "Datos de actualización inválidos." });
    }
    const updates = parsed.data;

    try {
        const updatedReport = await prisma.report.update({
            where: { 
                id: reportId,
                professionalId: professionalId, 
                status: "borrador", 
            },
            data: updates,
        });

        return res.json(updatedReport);

    } catch (e) {
        if (e.code === 'P2025') {
            return res.status(404).json({ message: "El informe no existe, ya está cerrado o no tienes permisos para editarlo." });
        }
        console.error("[Reports] Update DB Error:", e);
        return res.status(500).json({ message: "Error al actualizar el informe." });
    }
});


// --- RUTA 4: POST /:id/lock (Cerrar Informe) ---
router.post("/:id/lock", async (req, res) => {
    const reportId = req.params.id;
    const professionalId = getProfessionalId(req);
    if (!professionalId) return res.status(401).json({ message: "Autenticación requerida." });

    try {
        const updatedReport = await prisma.report.update({
            where: { 
                id: reportId, 
                professionalId: professionalId, 
                status: "borrador" 
            },
            data: { 
                status: "cerrado", 
                lockedAt: new Date().toISOString() 
            },
        });

        return res.json(updatedReport); 
        
    } catch (e) {
        if (e.code === 'P2025') {
            return res.status(400).json({ message: "El informe ya fue cerrado o no tienes permisos para cerrarlo." });
        }
        console.error("[Reports] Lock Error:", e);
        return res.status(500).json({ message: "Error al cerrar el informe." });
    }
});


router.get("/patients/:patientId/reports", async (req, res) => {
    const { patientId } = req.params;
    const professionalId = getProfessionalId(req);

    if (!professionalId) {
        return res.status(401).json({ message: "Autenticación requerida." });
    }
    
    if (!(await checkPatientOwnership(patientId, professionalId))) {
        return res.status(403).json({ message: "No tienes permiso para ver los reportes de este paciente." });
    }

    try {
        const reports = await prisma.report.findMany({
            where: {
                patientId: patientId,
            },
            orderBy: { createdAt: 'desc' },
        });

        return res.json(reports);

    } catch (e) {
        console.error("[Reports] List By Patient DB Error:", e);
        return res.status(500).json({ message: "Error al listar reportes." });
    }
});


router.get("/:patientId/reports", async (req, res) => {
    const { patientId } = req.params;
    const professionalId = getProfessionalId(req);

    if (!professionalId) {
        return res.status(401).json({ message: "Autenticación requerida." });
    }
    
    if (!(await checkPatientOwnership(patientId, professionalId))) {
        return res.status(403).json({ message: "No tienes permiso para ver los reportes de este paciente." });
    }

    try {
        const reports = await prisma.report.findMany({
            where: {
                patientId: patientId,
            },
            orderBy: { createdAt: 'desc' },
        });

        return res.json(reports);

    } catch (e) {
        console.error("[Patients] List Reports DB Error:", e);
        return res.status(500).json({ message: "Error al listar reportes." });
    }
});


export default router;