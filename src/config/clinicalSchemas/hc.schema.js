/**
 * Historia Clínica (HC) Schema
 * Schema-driven configuration for clinical history form
 * Based on Excel: "Maquetado de campos por sección HC y Nota"
 */

import { MEXICAN_STATES } from "../../utils/constants";

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
    {
      sectionId: "ficha",
      title: "Ficha de Identificación",
      description: "Datos básicos del paciente",
      fields: [
        {
          id: "expediente",
          label: "No. Expediente",
          type: "readonly",
          computed: (formData, context) => {
            // Auto-generated from patient ID or sequential number
            return context?.patientId ? `EXP-${context.patientId.slice(0, 8).toUpperCase()}` : "EXP-00000000";
          },
        },
        {
          id: "nombre_completo",
          label: "Nombre completo",
          type: "readonly",
          computed: (formData, context) => {
            return context?.patient ? `${context.patient.firstName} ${context.patient.lastName}`.trim() : "";
          },
        },
        {
          id: "fecha_nacimiento",
          label: "Fecha de nacimiento",
          type: "date",
          required: true,
          computed: (formData, context) => {
            return context?.patient?.birthDate || "";
          },
        },
        {
          id: "edad",
          label: "Edad",
          type: "readonly",
          computed: (formData, context) => {
            const birthDate = formData.fecha_nacimiento || context?.patient?.birthDate;
            const age = computeAge(birthDate);
            return age !== null ? `${age} años` : "";
          },
        },
        {
          id: "sexo",
          label: "Sexo",
          type: "select",
          required: true,
          options: GENDER_OPTIONS,
          computed: (formData, context) => {
            return context?.patient?.gender || "";
          },
        },
        {
          id: "identidad_genero",
          label: "Identidad de género",
          type: "select",
          options: GENDER_IDENTITY_OPTIONS,
        },
        {
          id: "nacionalidad",
          label: "Nacionalidad",
          type: "select",
          required: true,
          options: NATIONALITY_OPTIONS,
        },
        {
          id: "entidad",
          label: "Entidad federativa",
          type: "select",
          required: true,
          options: MEXICAN_STATES,
        },
        {
          id: "municipio",
          label: "Municipio",
          type: "text",
          required: true,
          placeholder: "Nombre del municipio",
        },
        {
          id: "curp",
          label: "CURP",
          type: "text",
          placeholder: "XXXX000000XXXXXX00",
          computed: (formData, context) => {
            return context?.patient?.curp || "";
          },
        },
      ],
    },
    {
      sectionId: "ahf",
      title: "Antecedentes Heredofamiliares (AHF)",
      description: "Historial médico familiar",
      fields: [
        {
          id: "ahf_entries",
          label: "Antecedentes familiares",
          type: "list",
          repeatable: true,
          addLabel: "Agregar antecedente familiar",
          emptyMessage: "No hay antecedentes familiares registrados",
          subfields: [
            {
              id: "enfermedad",
              label: "Enfermedad",
              type: "text",
              required: true,
              placeholder: "Ej: Diabetes, Hipertensión",
            },
            {
              id: "parentesco",
              label: "Parentesco",
              type: "select",
              required: true,
              options: RELATIONSHIP_OPTIONS,
            },
            {
              id: "edad_diagnostico",
              label: "Edad al diagnóstico",
              type: "number",
              placeholder: "Años",
            },
            {
              id: "estado_vital",
              label: "Estado vital",
              type: "select",
              options: VITAL_STATUS_OPTIONS,
            },
          ],
        },
      ],
    },
    {
      sectionId: "apnp",
      title: "Antecedentes Personales No Patológicos (APNP)",
      description: "Datos sociales y demográficos",
      fields: [
        {
          id: "estado_civil",
          label: "Estado civil",
          type: "select",
          options: MARITAL_STATUS_OPTIONS,
        },
        {
          id: "escolaridad",
          label: "Escolaridad",
          type: "select",
          options: EDUCATION_OPTIONS,
        },
        {
          id: "ocupacion",
          label: "Ocupación",
          type: "text",
          placeholder: "Ocupación actual",
        },
        {
          id: "religion",
          label: "Religión",
          type: "text",
          placeholder: "Religión o creencia",
        },
        {
          id: "habitos_alimenticios",
          label: "Hábitos alimenticios",
          type: "textarea",
          placeholder: "Describe hábitos alimenticios",
        },
        {
          id: "actividad_fisica",
          label: "Actividad física",
          type: "textarea",
          placeholder: "Describe actividad física regular",
        },
        {
          id: "habitos_toxicos",
          label: "Hábitos tóxicos",
          type: "textarea",
          placeholder: "Alcohol, tabaco, drogas, etc.",
        },
        {
          id: "sueño",
          label: "Patrón de sueño",
          type: "textarea",
          placeholder: "Horas de sueño, calidad, etc.",
        },
      ],
    },
    {
      sectionId: "app",
      title: "Antecedentes Personales Patológicos (APP)",
      description: "Historial médico personal",
      fields: [
        {
          id: "tiene_alergias",
          label: "¿Tiene alergias?",
          type: "yesno",
          required: true,
        },
        {
          id: "alergias_lista",
          label: "Lista de alergias",
          type: "list",
          repeatable: true,
          conditional: {
            field: "tiene_alergias",
            value: "SI",
          },
          addLabel: "Agregar alergia",
          subfields: [
            {
              id: "alergeno",
              label: "Alérgeno",
              type: "text",
              required: true,
              placeholder: "Ej: Penicilina, Polen",
            },
            {
              id: "reaccion",
              label: "Reacción",
              type: "text",
              placeholder: "Tipo de reacción",
            },
          ],
        },
        {
          id: "medicacion_actual",
          label: "Medicación actual",
          type: "list",
          repeatable: true,
          addLabel: "Agregar medicamento",
          subfields: [
            {
              id: "medicamento",
              label: "Medicamento",
              type: "text",
              required: true,
              placeholder: "Nombre del medicamento",
            },
            {
              id: "dosis",
              label: "Dosis",
              type: "text",
              placeholder: "Dosis y frecuencia",
            },
            {
              id: "indicacion",
              label: "Indicación",
              type: "text",
              placeholder: "Para qué se prescribe",
            },
          ],
        },
        {
          id: "enfermedades_cronicas",
          label: "Enfermedades crónicas",
          type: "list",
          repeatable: true,
          addLabel: "Agregar enfermedad",
          subfields: [
            {
              id: "enfermedad",
              label: "Enfermedad",
              type: "text",
              required: true,
              placeholder: "Nombre de la enfermedad",
            },
            {
              id: "fecha_diagnostico",
              label: "Fecha de diagnóstico",
              type: "date",
            },
            {
              id: "tratamiento",
              label: "Tratamiento",
              type: "text",
              placeholder: "Tratamiento actual",
            },
          ],
        },
        {
          id: "cirugias",
          label: "Cirugías previas",
          type: "list",
          repeatable: true,
          addLabel: "Agregar cirugía",
          subfields: [
            {
              id: "procedimiento",
              label: "Procedimiento",
              type: "text",
              required: true,
              placeholder: "Tipo de cirugía",
            },
            {
              id: "fecha",
              label: "Fecha",
              type: "date",
            },
            {
              id: "complicaciones",
              label: "Complicaciones",
              type: "text",
              placeholder: "Si las hubo",
            },
          ],
        },
        {
          id: "hospitalizaciones",
          label: "Hospitalizaciones previas",
          type: "list",
          repeatable: true,
          addLabel: "Agregar hospitalización",
          subfields: [
            {
              id: "motivo",
              label: "Motivo",
              type: "text",
              required: true,
              placeholder: "Razón de hospitalización",
            },
            {
              id: "fecha",
              label: "Fecha",
              type: "date",
            },
            {
              id: "duracion",
              label: "Duración (días)",
              type: "number",
            },
          ],
        },
        {
          id: "traumatismos",
          label: "Traumatismos",
          type: "textarea",
          placeholder: "Traumatismos importantes",
        },
        {
          id: "transfusiones",
          label: "Transfusiones",
          type: "yesno",
        },
        {
          id: "transfusiones_detalle",
          label: "Detalle de transfusiones",
          type: "textarea",
          conditional: {
            field: "transfusiones",
            value: "SI",
          },
          placeholder: "Tipo, fecha, motivo",
        },
      ],
    },
    {
      sectionId: "apsic",
      title: "Antecedentes Psiquiátricos (APsic)",
      description: "Historial psiquiátrico y psicológico",
      fields: [
        {
          id: "motivo_consulta",
          label: "Motivo de consulta",
          type: "textarea",
          required: true,
          placeholder: "Razón principal de consulta",
        },
        {
          id: "inicio_sintomas",
          label: "Inicio de síntomas",
          type: "textarea",
          placeholder: "Cuándo y cómo comenzaron los síntomas",
        },
        {
          id: "diagnosticos_previos",
          label: "Diagnósticos previos",
          type: "list",
          repeatable: true,
          addLabel: "Agregar diagnóstico previo",
          subfields: [
            {
              id: "diagnostico",
              label: "Diagnóstico",
              type: "text",
              required: true,
              placeholder: "Código o nombre del diagnóstico",
            },
            {
              id: "fecha",
              label: "Fecha",
              type: "date",
            },
            {
              id: "profesional",
              label: "Profesional que diagnosticó",
              type: "text",
              placeholder: "Nombre del profesional",
            },
          ],
        },
        {
          id: "hospitalizaciones_psiquiatricas",
          label: "Hospitalizaciones psiquiátricas",
          type: "list",
          repeatable: true,
          addLabel: "Agregar hospitalización",
          subfields: [
            {
              id: "motivo",
              label: "Motivo",
              type: "text",
              required: true,
            },
            {
              id: "fecha",
              label: "Fecha",
              type: "date",
            },
            {
              id: "duracion",
              label: "Duración (días)",
              type: "number",
            },
            {
              id: "institucion",
              label: "Institución",
              type: "text",
            },
          ],
        },
        {
          id: "urgencias_psiquiatricas",
          label: "Urgencias psiquiátricas",
          type: "yesno",
        },
        {
          id: "urgencias_detalle",
          label: "Detalle de urgencias",
          type: "textarea",
          conditional: {
            field: "urgencias_psiquiatricas",
            value: "SI",
          },
          placeholder: "Fecha, motivo, atención recibida",
        },
        {
          id: "suicidio_autolesion_tamiz",
          label: "Tamizaje de riesgo suicida/autolesión",
          type: "yesno",
          required: true,
        },
        {
          id: "suicidio_autolesion_detalle",
          label: "Detalle de riesgo",
          type: "textarea",
          conditional: {
            field: "suicidio_autolesion_tamiz",
            value: "SI",
          },
          required: true,
          placeholder: "Describir ideación, intentos, planes, factores protectores",
        },
        {
          id: "tratamientos_previos",
          label: "Tratamientos previos",
          type: "textarea",
          placeholder: "Psicoterapias, medicamentos, otros tratamientos",
        },
        {
          id: "adherencia_tratamiento",
          label: "Adherencia a tratamientos previos",
          type: "textarea",
          placeholder: "Nivel de adherencia y razones",
        },
      ],
    },
  ],
};

export default HC_SCHEMA;

