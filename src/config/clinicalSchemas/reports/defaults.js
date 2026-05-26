/**
 * Helpers compartidos para pre-cargar reportes con datos del profesional,
 * del paciente y de su historial clínico (sesiones, recetas).
 */

import { formatDateISOToHuman } from "../../../utils/formatters";

/**
 * Formatea la dirección del consultorio en una sola línea legible.
 * Ej: "Av. Reforma 123, Centro, Ciudad de México, CDMX, CP 06000"
 */
export function formatConsultorioAddress(professional) {
  if (!professional) return "";
  const explicit = professional.officeAddress || professional.officeFullAddress;
  if (explicit) return explicit;

  const addr = professional.address || {};
  const parts = [
    professional.officeName,
    addr.street,
    addr.neighborhood,
    addr.city,
    addr.state,
    addr.postalCode ? `CP ${addr.postalCode}` : null,
  ].filter(Boolean);
  return parts.join(", ");
}

/**
 * Combina los datos de contacto del profesional en una sola línea.
 * Ej: "+52 555 111 2222 · doctor@demo.com"
 */
export function formatProfesionalContacto(professional) {
  if (!professional) return "";
  const parts = [professional.phone, professional.email].filter(Boolean);
  return parts.join(" · ");
}

/**
 * Cuenta las sesiones efectivamente atendidas del paciente.
 * Usa el estado COMPLETED (alias del status interno SESSION_STATUS.ATENDIDA).
 */
export function countCompletedSessions(sessions) {
  if (!Array.isArray(sessions)) return 0;
  return sessions.filter((s) => s.status === "COMPLETED").length;
}

/**
 * Calcula el rango de fechas del tratamiento basado en las sesiones registradas.
 * Devuelve { desde, hasta } en formato YYYY-MM-DD (input type="date" compatible).
 */
export function computeSessionPeriod(sessions) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return { desde: "", hasta: "" };
  }
  const completed = sessions.filter((s) => s.status === "COMPLETED" && s.scheduledAt);
  const reference = completed.length > 0 ? completed : sessions.filter((s) => s.scheduledAt);
  if (reference.length === 0) return { desde: "", hasta: "" };

  const dates = reference.map((s) => new Date(s.scheduledAt).getTime()).filter((t) => !Number.isNaN(t));
  if (dates.length === 0) return { desde: "", hasta: "" };

  const min = new Date(Math.min(...dates));
  const max = new Date(Math.max(...dates));
  return {
    desde: min.toISOString().slice(0, 10),
    hasta: max.toISOString().slice(0, 10),
  };
}

/**
 * Resume las prescripciones activas del paciente en texto plano apto para
 * el campo "medicacionActual" de los reportes psiquiátricos.
 */
export function summarizeActivePrescriptions(prescriptions) {
  if (!Array.isArray(prescriptions) || prescriptions.length === 0) return "";
  const active = prescriptions.filter((rx) => (rx.status || "").toUpperCase() === "ACTIVE");
  const source = active.length > 0 ? active : prescriptions;
  return source
    .flatMap((rx) => {
      const meds = Array.isArray(rx.medications) ? rx.medications : [];
      if (meds.length === 0) {
        return rx.folio ? [`Receta ${rx.folio} (${formatDateISOToHuman(rx.signedAt || rx.createdAt)})`] : [];
      }
      return meds.map((m) => {
        const bits = [m.name, m.dose, m.frequency, m.duration].filter(Boolean).join(" · ");
        return bits || m.instructions || "Sin detalle";
      });
    })
    .join("\n");
}

/**
 * Edad en años a partir de la fecha de nacimiento.
 */
export function computeAge(birthDate) {
  if (!birthDate) return "";
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return String(age);
}

export default {
  formatConsultorioAddress,
  formatProfesionalContacto,
  countCompletedSessions,
  computeSessionPeriod,
  summarizeActivePrescriptions,
  computeAge,
};
