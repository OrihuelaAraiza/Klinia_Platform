/**
 * Schema del Reporte Psiquiátrico.
 * Reservado a profesionales con specialty === PSIQUIATRA.
 * Estructura alineada con NOM-004: incluye impresión diagnóstica DSM-5/CIE-11,
 * tratamiento farmacológico vigente, evolución clínica y plan terapéutico.
 */

import { SPECIALTIES } from "../../../utils/constants";
import {
  formatConsultorioAddress,
  formatProfesionalContacto,
  summarizeActivePrescriptions,
  computeAge,
} from "./defaults";

export const PSIQUIATRICO_TEMPLATE_ID = "PSIQUIATRICO";
export const PSIQUIATRICO_TEMPLATE_LABEL = "Reporte Psiquiátrico";
export const PSIQUIATRICO_TEMPLATE_DESCRIPTION =
  "Constancia clínica psiquiátrica con impresión diagnóstica, tratamiento farmacológico y evolución.";

export const SISTEMA_DIAGNOSTICO_OPTIONS = [
  { value: "DSM5", label: "DSM-5" },
  { value: "DSM5TR", label: "DSM-5-TR" },
  { value: "CIE11", label: "CIE-11" },
  { value: "CIE10", label: "CIE-10" },
];

export const VIA_ADMINISTRACION_OPTIONS = [
  { value: "ORAL", label: "Oral" },
  { value: "SUBLINGUAL", label: "Sublingual" },
  { value: "INTRAMUSCULAR", label: "Intramuscular" },
  { value: "INTRAVENOSA", label: "Intravenosa" },
  { value: "TRANSDERMICA", label: "Transdérmica" },
  { value: "INHALADA", label: "Inhalada" },
  { value: "OTRA", label: "Otra" },
];

export const FRECUENCIA_FARMACO_OPTIONS = [
  { value: "CADA_8H", label: "Cada 8 horas" },
  { value: "CADA_12H", label: "Cada 12 horas" },
  { value: "CADA_24H", label: "Cada 24 horas" },
  { value: "BID", label: "BID (2 veces al día)" },
  { value: "TID", label: "TID (3 veces al día)" },
  { value: "QID", label: "QID (4 veces al día)" },
  { value: "PRN", label: "PRN (por razón necesaria)" },
  { value: "SEMANAL", label: "Semanal" },
  { value: "OTRA", label: "Otra" },
];

export const ADHERENCIA_OPTIONS = [
  { value: "OPTIMA", label: "Óptima (>90%)" },
  { value: "PARCIAL", label: "Parcial (50–90%)" },
  { value: "DEFICIENTE", label: "Deficiente (<50%)" },
  { value: "NO_VALORADA", label: "No valorada" },
];

export const RESPUESTA_OPTIONS = [
  { value: "REMISION", label: "Remisión completa" },
  { value: "MEJORIA_SIGNIFICATIVA", label: "Mejoría significativa" },
  { value: "MEJORIA_PARCIAL", label: "Mejoría parcial" },
  { value: "SIN_CAMBIOS", label: "Sin cambios" },
  { value: "EMPEORAMIENTO", label: "Empeoramiento" },
];

export const RIESGO_OPTIONS = [
  { value: "BAJO", label: "Bajo" },
  { value: "MODERADO", label: "Moderado" },
  { value: "ALTO", label: "Alto" },
  { value: "CRITICO", label: "Crítico — requiere intervención inmediata" },
];

export const PSIQUIATRICO_SECTIONS = [
  {
    id: "profesional",
    title: "Datos del médico psiquiatra",
    description: "Tomado automáticamente de tu perfil profesional. Para modificar, ve a tu perfil.",
    fields: [
      { name: "profesionalNombre", label: "Nombre completo", type: "text", required: true, readOnly: true, lockedBy: "profile" },
      { name: "profesionalCedulaMedicina", label: "Cédula profesional (Medicina)", type: "text", required: true, readOnly: true, lockedBy: "profile" },
      { name: "profesionalCedulaEspecialidad", label: "Cédula de especialidad (Psiquiatría)", type: "text", required: true, readOnly: true, lockedBy: "profile" },
      { name: "profesionalCedulaSubespecialidad", label: "Cédula de subespecialidad", type: "text", readOnly: true, lockedBy: "profile" },
      { name: "consultorioDireccion", label: "Dirección del consultorio", type: "textarea", rows: 2, readOnly: true, lockedBy: "profile" },
      { name: "profesionalContacto", label: "Datos de contacto", type: "text", placeholder: "Teléfono / correo", readOnly: true, lockedBy: "profile" },
    ],
  },
  {
    id: "paciente",
    title: "Datos del paciente",
    description: "Datos identificadores tomados del expediente del paciente.",
    fields: [
      { name: "pacienteNombre", label: "Nombre completo", type: "text", required: true, readOnly: true, lockedBy: "patient" },
      { name: "pacienteFechaNacimiento", label: "Fecha de nacimiento", type: "date", readOnly: true, lockedBy: "patient" },
      { name: "pacienteCurp", label: "CURP", type: "text", readOnly: true, lockedBy: "patient" },
      { name: "pacienteEdad", label: "Edad (años)", type: "number", min: 0, readOnly: true, lockedBy: "patient" },
      { name: "pacienteSexo", label: "Sexo", type: "select", readOnly: true, lockedBy: "patient", options: [
        { value: "M", label: "Masculino" },
        { value: "F", label: "Femenino" },
        { value: "OTRO", label: "Otro" },
      ] },
    ],
  },
  {
    id: "diagnostico",
    title: "Impresión diagnóstica",
    description: "Clasificación nosológica conforme a sistema diagnóstico vigente.",
    fields: [
      { name: "sistemaDiagnostico", label: "Sistema diagnóstico", type: "select", options: SISTEMA_DIAGNOSTICO_OPTIONS, required: true },
      { name: "diagnosticoPrincipal", label: "Diagnóstico principal (código y descripción)", type: "textarea", rows: 2, required: true, placeholder: "Ej. F33.1 — Trastorno depresivo recurrente, episodio actual moderado" },
      { name: "diagnosticosSecundarios", label: "Diagnósticos secundarios / comorbilidad", type: "textarea", rows: 3 },
      { name: "ejeBiologico", label: "Hallazgos del eje biológico", type: "textarea", rows: 2 },
      { name: "ejePsicologico", label: "Hallazgos del eje psicológico", type: "textarea", rows: 2 },
      { name: "ejeSocial", label: "Hallazgos del eje social", type: "textarea", rows: 2 },
    ],
  },
  {
    id: "farmacologico",
    title: "Tratamiento farmacológico vigente",
    description: "Listado de psicofármacos actuales con dosis, vía y frecuencia.",
    fields: [
      { name: "medicacionActual", label: "Esquema farmacológico actual", type: "textarea", rows: 5, required: true, placeholder: "Ej.\nSertralina 50 mg VO c/24h\nClonazepam 0.5 mg VO en la noche PRN insomnio" },
      { name: "viaPrincipal", label: "Vía de administración predominante", type: "select", options: VIA_ADMINISTRACION_OPTIONS },
      { name: "frecuenciaPrincipal", label: "Frecuencia principal del esquema", type: "select", options: FRECUENCIA_FARMACO_OPTIONS },
      { name: "adherencia", label: "Adherencia terapéutica", type: "select", options: ADHERENCIA_OPTIONS, required: true },
      { name: "efectosAdversos", label: "Efectos adversos reportados", type: "textarea", rows: 2 },
      { name: "interacciones", label: "Interacciones relevantes / alertas", type: "textarea", rows: 2 },
    ],
  },
  {
    id: "evolucion",
    title: "Evolución clínica psiquiátrica",
    description: "Curso del padecimiento y respuesta al tratamiento.",
    fields: [
      { name: "duracionTratamiento", label: "Duración del tratamiento (meses)", type: "number", min: 0 },
      { name: "respuestaClinica", label: "Respuesta clínica global", type: "select", options: RESPUESTA_OPTIONS, required: true },
      { name: "examenMental", label: "Resumen del examen mental actual", type: "textarea", rows: 4, required: true },
      { name: "escalas", label: "Escalas aplicadas (Hamilton, PHQ-9, BPRS, MMSE, etc.)", type: "textarea", rows: 3, placeholder: "Ej. HAM-D pre: 22 / post: 8" },
      { name: "riesgoSuicida", label: "Nivel de riesgo suicida", type: "select", options: RIESGO_OPTIONS, required: true },
      { name: "riesgoHeteroagresivo", label: "Nivel de riesgo heteroagresivo", type: "select", options: RIESGO_OPTIONS, required: true },
    ],
  },
  {
    id: "plan",
    title: "Plan terapéutico y recomendaciones",
    description: "Recomendaciones, controles y alertas para el seguimiento.",
    fields: [
      { name: "planContinuacion", label: "Plan de continuación", type: "textarea", rows: 4, required: true },
      { name: "frecuenciaConsultas", label: "Frecuencia recomendada de consultas", type: "text", placeholder: "Ej. mensual" },
      { name: "indicacionesPaciente", label: "Indicaciones para el paciente / familia", type: "textarea", rows: 3 },
      { name: "alertas", label: "Alertas clínicas (signos de empeoramiento, contacto inmediato)", type: "textarea", rows: 2 },
      { name: "observaciones", label: "Observaciones adicionales", type: "textarea", rows: 3 },
    ],
  },
];

export const PSIQUIATRICO_SCHEMA = {
  id: PSIQUIATRICO_TEMPLATE_ID,
  label: PSIQUIATRICO_TEMPLATE_LABEL,
  description: PSIQUIATRICO_TEMPLATE_DESCRIPTION,
  requiredSpecialty: SPECIALTIES.PSIQUIATRA,
  sections: PSIQUIATRICO_SECTIONS,
};

export function getAllPsiquiatricoFields() {
  return PSIQUIATRICO_SECTIONS.flatMap((section) => section.fields);
}

export function buildDefaultPsiquiatricoData({ patient, professional, prescriptions } = {}) {
  const fullName = patient ? `${patient.firstName || ""} ${patient.lastName || ""}`.trim() : "";
  const ageFromBirth = computeAge(patient?.birthDate);
  const medicacionResumen = summarizeActivePrescriptions(prescriptions);

  return {
    profesionalNombre: professional?.name || "",
    profesionalCedulaMedicina: professional?.certificateFolio || "",
    profesionalCedulaEspecialidad: "",
    profesionalCedulaSubespecialidad: "",
    consultorioDireccion: formatConsultorioAddress(professional),
    profesionalContacto: formatProfesionalContacto(professional),
    pacienteNombre: fullName,
    pacienteFechaNacimiento: patient?.birthDate || "",
    pacienteCurp: patient?.curp || "",
    pacienteEdad: ageFromBirth,
    pacienteSexo: patient?.gender || "",
    sistemaDiagnostico: "DSM5TR",
    diagnosticoPrincipal: "",
    diagnosticosSecundarios: "",
    ejeBiologico: "",
    ejePsicologico: "",
    ejeSocial: "",
    medicacionActual: medicacionResumen,
    viaPrincipal: "ORAL",
    frecuenciaPrincipal: "",
    adherencia: "",
    efectosAdversos: "",
    interacciones: "",
    duracionTratamiento: "",
    respuestaClinica: "",
    examenMental: "",
    escalas: "",
    riesgoSuicida: "BAJO",
    riesgoHeteroagresivo: "BAJO",
    planContinuacion: "",
    frecuenciaConsultas: "",
    indicacionesPaciente: "",
    alertas: "",
    observaciones: "",
  };
}

export function validatePsiquiatricoData(data = {}) {
  const errors = {};
  getAllPsiquiatricoFields().forEach((field) => {
    if (!field.required) return;
    const value = data[field.name];
    if (value === undefined || value === null || String(value).trim() === "") {
      errors[field.name] = `${field.label} es obligatorio.`;
    }
  });
  return errors;
}

export default PSIQUIATRICO_SCHEMA;
