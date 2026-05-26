/**
 * Schema de la Constancia Psicoterapéutica (TBE).
 * Estructura alineada con NOM-004 — secciones legales requeridas
 * para certificación de asistencia a terapia psicológica.
 */

import {
  formatConsultorioAddress,
  formatProfesionalContacto,
  countCompletedSessions,
  computeSessionPeriod,
} from "./defaults";

export const TBE_TEMPLATE_ID = "TBE_PSICOTERAPEUTICO";
export const TBE_TEMPLATE_LABEL = "Constancia Psicoterapéutica (TBE)";
export const TBE_TEMPLATE_DESCRIPTION =
  "Certificación oficial de asistencia y evolución en terapia psicológica.";

export const FRECUENCIA_OPTIONS = [
  { value: "SEMANAL", label: "Semanal" },
  { value: "QUINCENAL", label: "Quincenal" },
  { value: "MENSUAL", label: "Mensual" },
  { value: "VARIABLE", label: "Variable" },
];

export const MODALIDAD_OPTIONS = [
  { value: "PRESENCIAL", label: "Presencial" },
  { value: "VIRTUAL", label: "Virtual" },
  { value: "MIXTA", label: "Mixta" },
];

export const INTERVENCION_OPTIONS = [
  { value: "INDIVIDUAL", label: "Psicoterapia individual" },
  { value: "PAREJA", label: "Terapia de pareja" },
  { value: "FAMILIAR", label: "Terapia familiar" },
  { value: "GRUPAL", label: "Terapia grupal" },
  { value: "INFANTIL", label: "Psicoterapia infantil" },
  { value: "OTRA", label: "Otra" },
];

export const EVOLUCION_OPTIONS = [
  { value: "FAVORABLE", label: "Favorable" },
  { value: "ESTABLE", label: "Estable" },
  { value: "RESERVADA", label: "Reservada" },
  { value: "DESFAVORABLE", label: "Desfavorable" },
];

export const TBE_SECTIONS = [
  {
    id: "profesional",
    title: "Datos del profesional",
    description: "Tomado automáticamente de tu perfil profesional. Para modificar, ve a tu perfil.",
    fields: [
      { name: "profesionalNombre", label: "Nombre completo", type: "text", required: true, readOnly: true, lockedBy: "profile" },
      { name: "profesionalCedulaLic", label: "Cédula profesional (Licenciatura)", type: "text", required: true, readOnly: true, lockedBy: "profile" },
      { name: "profesionalCedulaMaestria", label: "Cédula profesional (Maestría)", type: "text", readOnly: true, lockedBy: "profile" },
      { name: "profesionalCedulaDoctorado", label: "Cédula profesional (Doctorado)", type: "text", readOnly: true, lockedBy: "profile" },
      { name: "consultorioDireccion", label: "Dirección del consultorio", type: "textarea", rows: 2, readOnly: true, lockedBy: "profile" },
      { name: "profesionalContacto", label: "Datos de contacto", type: "text", placeholder: "Teléfono / correo", readOnly: true, lockedBy: "profile" },
    ],
  },
  {
    id: "asistencia",
    title: "Certificación de asistencia",
    description: "Los datos identificadores del paciente provienen del expediente. Los campos clínicos son editables.",
    fields: [
      { name: "pacienteNombre", label: "Nombre del paciente", type: "text", required: true, readOnly: true, lockedBy: "patient" },
      { name: "pacienteFechaNacimiento", label: "Fecha de nacimiento", type: "date", readOnly: true, lockedBy: "patient" },
      { name: "periodoDesde", label: "Periodo desde", type: "date", required: true },
      { name: "periodoHasta", label: "Periodo hasta", type: "date", required: true },
    ],
  },
  {
    id: "detalles",
    title: "Detalles técnicos",
    description: "Resumen estadístico del tratamiento.",
    fields: [
      { name: "totalSesiones", label: "Número total de sesiones", type: "number", required: true, min: 0 },
      { name: "frecuencia", label: "Frecuencia", type: "select", options: FRECUENCIA_OPTIONS, required: true },
      { name: "modalidad", label: "Modalidad", type: "select", options: MODALIDAD_OPTIONS, required: true },
      { name: "tipoIntervencion", label: "Tipo de intervención", type: "select", options: INTERVENCION_OPTIONS, required: true },
    ],
  },
  {
    id: "observaciones",
    title: "Observaciones clínicas",
    description: "Síntesis del proceso terapéutico. Sujeta al secreto profesional.",
    fields: [
      { name: "motivoConsulta", label: "Motivo de consulta", type: "textarea", rows: 3, required: true },
      { name: "sintomas", label: "Síntomas detectados", type: "textarea", rows: 3 },
      { name: "evolucion", label: "Evolución del paciente", type: "select", options: EVOLUCION_OPTIONS, required: true },
      { name: "recomendaciones", label: "Recomendaciones finales", type: "textarea", rows: 4, required: true },
    ],
  },
];

export const TBE_SCHEMA = {
  id: TBE_TEMPLATE_ID,
  label: TBE_TEMPLATE_LABEL,
  description: TBE_TEMPLATE_DESCRIPTION,
  sections: TBE_SECTIONS,
};

export function getAllTbeFields() {
  return TBE_SECTIONS.flatMap((section) => section.fields);
}

export function buildDefaultTbeData({ patient, professional, sessions } = {}) {
  const fullName = patient ? `${patient.firstName || ""} ${patient.lastName || ""}`.trim() : "";
  const { desde, hasta } = computeSessionPeriod(sessions);
  const sesionesAtendidas = countCompletedSessions(sessions);

  return {
    profesionalNombre: professional?.name || "",
    profesionalCedulaLic: professional?.certificateFolio || professional?.license || "",
    profesionalCedulaMaestria: "",
    profesionalCedulaDoctorado: "",
    consultorioDireccion: formatConsultorioAddress(professional),
    profesionalContacto: formatProfesionalContacto(professional),
    pacienteNombre: fullName,
    pacienteFechaNacimiento: patient?.birthDate || "",
    periodoDesde: desde,
    periodoHasta: hasta,
    totalSesiones: sesionesAtendidas ? String(sesionesAtendidas) : "",
    frecuencia: "",
    modalidad: "",
    tipoIntervencion: "",
    motivoConsulta: patient?.purpose || "",
    sintomas: "",
    evolucion: "",
    recomendaciones: "",
  };
}

export function validateTbeData(data = {}) {
  const errors = {};
  getAllTbeFields().forEach((field) => {
    if (!field.required) return;
    const value = data[field.name];
    if (value === undefined || value === null || String(value).trim() === "") {
      errors[field.name] = `${field.label} es obligatorio.`;
    }
  });
  if (data.periodoDesde && data.periodoHasta) {
    if (new Date(data.periodoDesde) > new Date(data.periodoHasta)) {
      errors.periodoHasta = "La fecha 'hasta' debe ser posterior a 'desde'.";
    }
  }
  return errors;
}

export default TBE_SCHEMA;
