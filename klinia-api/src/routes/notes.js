import { Router } from "express";
import { z } from "zod";
import { prisma } from "../services/dbClient.js";
import { uid } from "../store/memory.js";

const router = Router();

function getProfessionalId(req) {
    return req.user?.id; 
}

/**
 * Verifica si el paciente asociado a un ID está bajo el cuidado del profesional autenticado.
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

const noteContentSchema = z.object({
    subjective: z.string().trim().min(1),
    objective: z.string().trim().min(1),
    analysis: z.string().trim().min(1),
    plan: z.string().trim().min(1),
    diagnoses: z.array(z.object({
        code: z.string(),
        label: z.string().optional(),
    })).optional(),
    professional: z.object({ id: z.string(), name: z.string() }).optional(),
    datetime: z.string().optional(), // opcional en el payload, pero usado en create
});

const addendumSchema = z.string().trim().min(5);

// --- RUTA 1: POST /:patientId (Crear Nota) ---
router.post("/:patientId", async (req, res) => {
    const { patientId } = req.params;
    const professionalId = getProfessionalId(req);
    
    if (!professionalId) return res.status(401).json({ message: "Autenticación requerida." });

    if (!(await checkPatientOwnership(patientId, professionalId))) {
        return res.status(403).json({ message: "No tienes permiso para crear notas para este paciente." });
    }

    const parsed = noteContentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Datos de nota inválidos." });

    const data = parsed.data;

    try {
        const newNote = await prisma.note.create({
            data: {
                id: uid("NOTE_"),
                patientId: patientId,
                professionalId: professionalId,
                subjective: data.subjective,
                objective: data.objective,
                analysis: data.analysis,
                plan: data.plan,
                diagnosesJson: JSON.stringify(data.diagnoses || []), // Guardar diagnósticos como JSON
                // Status por defecto es 'open'
            },
        });
        
        // Normalizar la salida para el frontend (incluir el profesional)
        const professionalName = data.professional?.name || (await prisma.user.findUnique({ where: { id: professionalId } }))?.name;
        
        return res.status(201).json({
            ...newNote,
            diagnoses: data.diagnoses, // Devolvemos el objeto JSON parseado al frontend
            professional: { id: professionalId, name: professionalName }
        });

    } catch (e) {
        console.error("[Notes] Create Note Error:", e);
        return res.status(500).json({ message: "Error al guardar la nota." });
    }
});

// --- RUTA 2: GET /:patientId (Listar Notas) ---
router.get("/:patientId", async (req, res) => {
    const { patientId } = req.params;
    const professionalId = getProfessionalId(req);

    if (!professionalId) return res.status(401).json({ message: "Autenticación requerida." });
    
    if (!(await checkPatientOwnership(patientId, professionalId))) {
        return res.status(403).json({ message: "No tienes permiso para ver las notas de este paciente." });
    }

    try {
        const notes = await prisma.note.findMany({
            where: { patientId },
            orderBy: { createdAt: "desc" },
            include: { professional: { select: { name: true, id: true } } },
        });
        
        // Deserializar JSON antes de enviar al frontend
        const normalizedNotes = notes.map(note => ({
            ...note,
            diagnoses: JSON.parse(note.diagnosesJson),
            addenda: JSON.parse(note.addendaJson),
        }));

        return res.json({ items: normalizedNotes, total: normalizedNotes.length, page: 1, size: notes.length });

    } catch (e) {
        console.error("[Notes] List Notes Error:", e);
        return res.status(500).json({ message: "Error al listar las notas." });
    }
});

// --- RUTA 3: GET /:patientId/:noteId (Obtener Detalle) ---
router.get("/:patientId/:noteId", async (req, res) => {
    const { patientId, noteId } = req.params;
    const professionalId = getProfessionalId(req);

    if (!professionalId) return res.status(401).json({ message: "Autenticación requerida." });

    if (!(await checkPatientOwnership(patientId, professionalId))) {
        return res.status(403).json({ message: "No tienes permiso para ver esta nota." });
    }

    try {
        const note = await prisma.note.findUnique({
            where: { id: noteId, patientId: patientId },
            include: { professional: { select: { name: true, id: true } } },
        });

        if (!note) return res.status(404).json({ message: "Nota no encontrada." });
        
        // Deserializar JSON
        return res.json({
            ...note,
            diagnoses: JSON.parse(note.diagnosesJson),
            addenda: JSON.parse(note.addendaJson),
        });

    } catch (e) {
        console.error("[Notes] Get Detail Error:", e);
        return res.status(500).json({ message: "Error al obtener la nota." });
    }
});

// --- RUTA 4: POST /:patientId/:noteId/close (Cerrar Nota) ---
router.post("/:patientId/:noteId/close", async (req, res) => {
    const { patientId, noteId } = req.params;
    const professionalId = getProfessionalId(req);

    if (!professionalId) return res.status(401).json({ message: "Autenticación requerida." });

    if (!(await checkPatientOwnership(patientId, professionalId))) {
        return res.status(403).json({ message: "No tienes permiso para cerrar notas de este paciente." });
    }

    try {
        const updatedNote = await prisma.note.update({
            where: { id: noteId, patientId: patientId, professionalId: professionalId, status: "open" },
            data: { status: "closed", closedAt: new Date().toISOString() },
            include: { professional: { select: { name: true, id: true } } },
        });
        
        // Deserializar JSON
        return res.json({
            ...updatedNote,
            diagnoses: JSON.parse(updatedNote.diagnosesJson),
            addenda: JSON.parse(updatedNote.addendaJson),
        });

    } catch (e) {
        if (e.code === 'P2025') {
            return res.status(404).json({ message: "Nota ya cerrada o no encontrada." });
        }
        console.error("[Notes] Close Note Error:", e);
        return res.status(500).json({ message: "Error al cerrar la nota." });
    }
});

// --- RUTA 5: POST /:patientId/:noteId/addendum (Agregar Addendum) ---
router.post("/:patientId/:noteId/addendum", async (req, res) => {
    const { patientId, noteId } = req.params;
    const professionalId = getProfessionalId(req);
    const parsed = addendumSchema.safeParse(req.body.text);

    if (!professionalId) return res.status(401).json({ message: "Autenticación requerida." });
    if (!parsed.success) return res.status(400).json({ message: "Contenido de addendum inválido." });

    const addendumText = parsed.data;

    if (!(await checkPatientOwnership(patientId, professionalId))) {
        return res.status(403).json({ message: "No tienes permiso para agregar addendum a esta nota." });
    }
    
    try {
        const existingNote = await prisma.note.findUnique({
             where: { id: noteId, patientId: patientId },
             select: { addendaJson: true, professionalId: true, professional: { select: { name: true } } }
        });

        if (!existingNote) return res.status(404).json({ message: "Nota no encontrada." });

        const currentAddenda = JSON.parse(existingNote.addendaJson || "[]");
        const authorName = existingNote.professional.name; // Usar el nombre del creador/dueño

        const newAddendum = {
            datetime: new Date().toISOString(),
            author: authorName, // Mantenemos el autor del terapeuta creador/dueño
            text: addendumText,
        };

        const updatedAddenda = [...currentAddenda, newAddendum];

        const updatedNote = await prisma.note.update({
            where: { id: noteId, patientId: patientId },
            data: { addendaJson: JSON.stringify(updatedAddenda), updatedAt: new Date().toISOString() },
            include: { professional: { select: { name: true, id: true } } },
        });

        // Deserializar JSON
        return res.json({
            ...updatedNote,
            diagnoses: JSON.parse(updatedNote.diagnosesJson),
            addenda: updatedAddenda,
        });

    } catch (e) {
        console.error("[Notes] Addendum Error:", e);
        return res.status(500).json({ message: "Error al agregar addendum." });
    }
});


export default router;