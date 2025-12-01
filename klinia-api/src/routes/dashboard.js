import { Router } from "express";
// 🛑 NUEVO: Importamos Prisma
import { prisma } from "../services/dbClient.js"; 
// El resto de importaciones en memoria se mantienen temporalmente
import { patients, notesByPatient, getAuditEvents } from "../store/memory.js";
// 🛑 Eliminamos la importación de funciones obsoletas
import { SESSION_STATUS } from "./sessions.js"; 
import { getPrescriptions, countActivePrescriptions } from "../store/prescriptions.js";

const router = Router();

// 🛑 ADAPTACIÓN DE FUNCIONES OBSOLETAS
// Ya no usamos getSessionsArray/getTodayBounds de memoria.

function buildPatientName(patientId) {
  // Esta función sigue usando la memoria patients.get()
  const patient = patients.get(patientId);
  if (!patient) {
    return "Paciente sin expediente";
  }
  const parts = [patient.firstName, patient.lastName].filter(Boolean);
  const full = parts.join(" ").trim();
  return full || patient.curp || patient.email || "Paciente sin nombre";
}

function pickLatestTimestamp(items, field) {
  return items.reduce((latest, item) => {
    const candidate = item[field];
    if (!candidate) {
      return latest;
    }
    const candidateDate = Date.parse(candidate);
    if (Number.isNaN(candidateDate)) {
      return latest;
    }
    if (!latest) {
      return candidate;
    }
    const latestDate = Date.parse(latest);
    if (Number.isNaN(latestDate) || candidateDate > latestDate) {
      return candidate;
    }
    return latest;
  }, null);
}

// 🛑 REEMPLAZO: Función que ahora consulta Prisma para las sesiones de hoy
async function collectTodaySessions() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  try {
    const sessions = await prisma.session.findMany({
      where: {
        datetime: {
          gte: today,
          lt: tomorrow,
        },
      },
      // Incluimos paciente y profesional para la función getSessionPatientName en el frontend
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true, curp: true } },
        professional: { select: { id: true, name: true } }
      },
      orderBy: { datetime: 'asc' },
    });
    return sessions;
  } catch (error) {
    console.error("[Dashboard] Error fetching today sessions from Prisma:", error);
    return [];
  }
}

router.get("/stats", async (req, res) => {
  try {
    const todaySessions = await collectTodaySessions();
    const prescriptions = getPrescriptions();
    const activePrescriptions = countActivePrescriptions();
    const lastPrescriptionTime = pickLatestTimestamp(prescriptions, "createdAt");
    const auditEvents = getAuditEvents();

    const sessionsToday = todaySessions.length;
    const sessionsCancelledToday = todaySessions.filter(
      (session) => session.status === SESSION_STATUS.CANCELADA
    ).length;

    const patientsActive = patients.size;
    const reportsGeneratedBase = Math.max(
      4,
      Math.round(auditEvents.length / 3) + sessionsToday + patientsActive
    );

    const reportsProgress = Math.min(
      100,
      Math.max(12, Math.round((reportsGeneratedBase / Math.max(patientsActive || 1, 1)) * 42))
    );

    res.json({
      patientsActive,
      sessionsToday,
      sessionsCancelledToday,
      prescriptionsActive: activePrescriptions,
      lastPrescriptionTime,
      reportsGenerated: reportsGeneratedBase,
      reportsProgress,
    });
  } catch (error) {
    console.error("[Dashboard] Error in /stats:", error);
    res.status(500).json({ message: "Error al obtener estadísticas" });
  }
});

router.get("/sessions/today", async (req, res) => {
  try {
    const todaySessions = await collectTodaySessions();
    const result = todaySessions
      .slice(0, 5)
      .map((session) => {
        // Construir nombre del paciente desde la relación o usar función helper
        const patientName = session.patient 
          ? [session.patient.firstName, session.patient.lastName].filter(Boolean).join(" ") || session.patient.curp || session.patient.email || "Paciente sin nombre"
          : buildPatientName(session.patientId);
        
        return {
          id: session.id,
          time: session.datetime,
          patientName: patientName,
          status: session.status,
        };
      });
    res.json(result);
  } catch (error) {
    console.error("[Dashboard] Error in /sessions/today:", error);
    res.status(500).json({ message: "Error al obtener sesiones de hoy" });
  }
});

router.get("/notes/recent", (req, res) => {
  const entries = [];
  notesByPatient.forEach((collection, patientId) => {
    collection.forEach((note) => {
      entries.push({
        id: note.id,
        patientId,
        patientName: buildPatientName(patientId),
        closedAt: note.closedAt || note.updatedAt || note.datetime,
      });
    });
  });

  entries.sort((a, b) => {
    const timeA = a.closedAt ? Date.parse(a.closedAt) : 0;
    const timeB = b.closedAt ? Date.parse(b.closedAt) : 0;
    return timeB - timeA;
  });

  res.json(entries.slice(0, 5));
});

router.get("/prescriptions/recent", (req, res) => {
  const prescriptions = getPrescriptions()
    .map((item) => ({
      id: item.id,
      patientId: item.patientId || null,
      patientName: item.patientName,
      folio: item.folio,
      signedAt: item.createdAt,
    }))
    .sort((a, b) => {
      const timeA = a.signedAt ? Date.parse(a.signedAt) : 0;
      const timeB = b.signedAt ? Date.parse(b.signedAt) : 0;
      return timeB - timeA;
    });

  res.json(prescriptions.slice(0, 5));
});

// 🛑 EXPORTACIÓN FALTANTE
export default router;