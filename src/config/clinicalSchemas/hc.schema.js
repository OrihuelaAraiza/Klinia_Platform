/**
 * Historia Clínica (HC) Schema
 * IDs alineados con backend / Prisma History model
 */
import { MEXICAN_STATES } from "../../utils/constants";
import { buildExpedienteNumber } from "../../utils/formatters";

// Catalogs
const GENDER_OPTIONS = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Femenino" },
  { value: "X", label: "No binario" },
  { value: "OTRO", label: "Otro" },
];

const GENDER_IDENTITY_OPTIONS = [
  { value: "CIS", label: "Cisgénero" },
  { value: "TRANS", label: "Transgénero" },
  { value: "NO_BINARIO", label: "No binario" },
  { value: "OTRO", label: "Otro" },
  { value: "PREFIERE_NO_DECIR", label: "Prefiere no decir" },
];

const MARITAL_STATUS_OPTIONS = [
  { value: "SOLTERO", label: "Soltero(a)" },
  { value: "CASADO", label: "Casado(a)" },
  { value: "DIVORCIADO", label: "Divorciado(a)" },
  { value: "VIUDO", label: "Viudo(a)" },
  { value: "UNION_LIBRE", label: "Unión libre" },
  { value: "OTRO", label: "Otro" },
];

const EDUCATION_OPTIONS = [
  { value: "SIN_ESCOLARIDAD", label: "Sin escolaridad" },
  { value: "PRIMARIA_INCOMPLETA", label: "Primaria incompleta" },
  { value: "PRIMARIA_COMPLETA", label: "Primaria completa" },
  { value: "SECUNDARIA_INCOMPLETA", label: "Secundaria incompleta" },
  { value: "SECUNDARIA_COMPLETA", label: "Secundaria completa" },
  { value: "PREPARATORIA_INCOMPLETA", label: "Preparatoria incompleta" },
  { value: "PREPARATORIA_COMPLETA", label: "Preparatoria completa" },
  { value: "TECNICA", label: "Técnica" },
  { value: "LICENCIATURA", label: "Licenciatura" },
  { value: "POSGRADO", label: "Posgrado" },
  { value: "OTRO", label: "Otro" },
];

const NATIONALITY_OPTIONS = [
  { value: "MEXICANA", label: "Mexicana" },
  { value: "EXTRANJERA", label: "Extranjera" },
];

const VITAL_STATUS_OPTIONS = [
  { value: "VIVO", label: "Vivo" },
  { value: "FALLECIDO", label: "Fallecido" },
];

const RELATIONSHIP_OPTIONS = [
  { value: "PADRE", label: "Padre" },
  { value: "MADRE", label: "Madre" },
  { value: "HERMANO", label: "Hermano(a)" },
  { value: "ABUELO", label: "Abuelo(a)" },
  { value: "TIO", label: "Tío(a)" },
  { value: "PRIMO", label: "Primo(a)" },
  { value: "HIJO", label: "Hijo(a)" },
  { value: "OTRO", label: "Otro" },
];

const YES_NO_OPTIONS = [
  { value: "SI", label: "Sí" },
  { value: "NO", label: "No" },
];

// Helper to compute age from birthDate
const computeAge = (birthDate) => {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

export const HC_SCHEMA = {
  sections: [
    /* =====================================================
     * FICHA DE IDENTIFICACIÓN
     * ===================================================== */
    {
      sectionId: "ficha",
      title: "Ficha de Identificación",
      description: "Datos básicos del paciente",
      fields: [
        {
          id: "expediente",
          label: "No. Expediente",
          type: "readonly",
          computed: (_, context) =>
            context?.patient ? buildExpedienteNumber(context.patient) : "",
        },
        {
          id: "nombreCompleto",
          label: "Nombre completo",
          type: "readonly",
          computed: (_, context) =>
            context?.patient
              ? `${context.patient.firstName} ${context.patient.lastName}`.trim()
              : "",
        },
        {
          id: "fechaNacimiento",
          label: "Fecha de nacimiento",
          type: "readonly",
          computed: (_, context) => context?.patient?.birthDate || "",
        },
        {
          id: "curp",
          label: "CURP",
          type: "readonly",
          computed: (_, context) => context?.patient?.curp || "",
        },
        {
          id: "nacionalidad",
          label: "Nacionalidad",
          type: "readonly",
          options: NATIONALITY_OPTIONS,
          computed: (_, context) => context?.patient?.nationality || "",
        },
        {
          id: "entidad",
          label: "Entidad federativa",
          type: "readonly",
          options: MEXICAN_STATES,
          computed: (_, context) => context?.patient?.state || "",
        },
        {
          id: "municipio",
          label: "Municipio",
          type: "text",
        },
        {
          id: "sexo",
          label: "Sexo",
          type: "readonly",
          options: GENDER_OPTIONS,
          computed: (_, context) => context?.patient?.gender || "",
        },
        {
          id: "genderIdentity",
          label: "Identidad de género",
          type: "select",
          options: GENDER_IDENTITY_OPTIONS,
        },
      ],
    },

    /* =====================================================
     * AHF
     * ===================================================== */
    {
      sectionId: "ahf",
      title: "Antecedentes Heredofamiliares (AHF)",
      description: "Historial médico familiar",
      fields: [
        {
          id: "familyBackground",
          label: "Antecedentes familiares",
          type: "list",
          repeatable: true,
          subfields: [
            { id: "enfermedad", label: "Enfermedad", type: "text", required: true },
            { id: "parentesco", label: "Parentesco", type: "text" },
            { id: "edadDiagnostico", label: "Edad al diagnóstico", type: "number" },
            { id: "estadoVital", label: "Estado vital", type: "text" },
          ],
        },
      ],
    },

    /* =====================================================
     * APNP
     * ===================================================== */
    {
      sectionId: "apnp",
      title: "Antecedentes Personales No Patológicos (APNP)",
      description: "Datos sociales y demográficos",
      fields: [
        { id: "dietaryHabits", label: "Hábitos alimenticios", type: "textarea", placeholder: "Alimentación habitual, preferencias, etc." },
        { id: "physicalActivity", label: "Actividad física", type: "textarea", placeholder: "Tipo, frecuencia, duración de la actividad física" },
        { id: "toxicHabits", label: "Hábitos tóxicos", type: "textarea", placeholder: "Alcohol, tabaco, drogas, etc." },
        { id: "sleepPatterns", label: "Patrón de sueño", type: "textarea", placeholder: "Horas de sueño, calidad, etc." },
      ],
    },

    /* =====================================================
     * APP
     * ===================================================== */
    {
      sectionId: "app",
      title: "Antecedentes Personales Patológicos (APP)",
      description: "Historial médico personal",
      fields: [
        { id: "hasAllergies", label: "¿Tiene alergias?", type: "yesno", required: true },
        {
          id: "currentMedications",
          label: "Medicación actual",
          type: "list",
          repeatable: true,
          addLabel: "Agregar medicamento",
          subfields: [
            { id: "medicamento", label: "Medicamento", type: "text", required: true, placeholder: "Nombre del medicamento" },
            { id: "dosis", label: "Dosis", type: "text" },
            { id: "indicacion", label: "Indicación", type: "text" },
          ],
        },
        {
          id: "chronicDiseases",
          label: "Enfermedades crónicas",
          type: "list",
          repeatable: true,
          subfields: [
            { id: "enfermedad", label: "Enfermedad", type: "text" },
            { id: "fechaDiagnostico", label: "Fecha diagnóstico", type: "date" },
            { id: "tratamiento", label: "Tratamiento", type: "text" },
          ],
        },
        {
          id: "previousSurgeries",
          label: "Cirugías previas",
          type: "list",
          repeatable: true,
          subfields: [
            { id: "procedimiento", label: "Procedimiento", type: "text" },
            { id: "fecha", label: "Fecha", type: "date" },
            { id: "complicaciones", label: "Complicaciones", type: "text" },
          ],
        },
        {
          id: "previousHospitalizations",
          label: "Hospitalizaciones previas",
          type: "list",
          repeatable: true,
          subfields: [
            { id: "motivo", label: "Motivo", type: "text" },
            { id: "fecha", label: "Fecha", type: "date" },
            { id: "duracion", label: "Duración", type: "number" },
          ],
        },
        { id: "traumatisms", label: "Traumatismos", type: "textarea", placeholder: "Traumatismos importantes" },
        { id: "transfusions", label: "Transfusiones", type: "yesno" },
      ],
    },

    /* =====================================================
     * APSIC
     * ===================================================== */
    {
      sectionId: "apsic",
      title: "Antecedentes Psiquiátricos",
      fields: [
        { id: "motive", label: "Motivo de consulta", type: "textarea", required: true, placeholder: "Razón principal de consulta" },
        { id: "symptomOnset", label: "Inicio de síntomas", type: "textarea", placeholder: "Cuándo y cómo comenzaron los síntomas" },
        {
          id: "previousDiagnoses",
          label: "Diagnósticos previos",
          type: "list",
          repeatable: true,
          addLabel: "Agregar diagnóstico previo",
          subfields: [
            { id: "diagnostico", label: "Diagnóstico", type: "text", required: true, placeholder: "Código o nombre del diagnóstico" },
            { id: "fecha", label: "Fecha", type: "date" },
            { id: "profesional", label: "Profesional", type: "text", placeholder: "Nombre del profesional" },
          ],
        },
        {
          id: "psychHospitalizations",
          label: "Hospitalizaciones psiquiátricas",
          type: "list",
          repeatable: true,
        },
        { id: "psychUrgencies", label: "Urgencias psiquiátricas", type: "yesno" },
        { id: "suicideRiskScreening", label: "Tamizaje riesgo suicida", type: "yesno" },
        { id: "previousTreatments", label: "Tratamientos previos", type: "textarea", placeholder: "Psicoterapias, medicamentos, otros tratamientos" },
        { id: "treatmentAdherence", label: "Adherencia a tratamientos", type: "textarea", placeholder: "Nivel de adherencia y razones" },
      ],
    },
  ],
};

export default HC_SCHEMA;