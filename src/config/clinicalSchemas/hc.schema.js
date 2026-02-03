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

const ALIMENTATION_OPTIONS = [
  { value: "BUENA", label: "Buena" },
  { value: "REGULAR", label: "Regular" },
  { value: "MALA", label: "Mala" },
];

const ALCOHOL_FREQUENCY_OPTIONS = [
  { value: "DIARIO", label: "Diario" },
  { value: "SEMANAL", label: "Semanal" },
  { value: "QUINCENAL", label: "Quincenal" },
  { value: "MENSUAL", label: "Mensual" },
  { value: "OCASIONAL", label: "Ocasional" },
  { value: "DESCONOCE", label: "Desconoce" },
  { value: "OTRO", label: "Otro" },
];

const TOXICOMANIA_FREQUENCY_OPTIONS = [
  { value: "DIARIO", label: "Diario" },
  { value: "SEMANAL", label: "Semanal" },
  { value: "QUINCENAL", label: "Quincenal" },
  { value: "MENSUAL", label: "Mensual" },
  { value: "OCASIONAL", label: "Ocasional" },
  { value: "EN_REMISION", label: "En remisión" },
  { value: "DESCONOCE", label: "Desconoce" },
  { value: "OTRO", label: "Otro" },
];

const RISK_LEVEL_OPTIONS = [
  { value: "AUSENTE", label: "Ausente" },
  { value: "BAJO", label: "Bajo" },
  { value: "MODERADO", label: "Moderado" },
  { value: "ALTO", label: "Alto" },
  { value: "INMINENTE", label: "Inminente" },
];

const HETEROAGGRESSIVE_RISK_OPTIONS = [
  { value: "AUSENTE", label: "Ausente" },
  { value: "BAJO", label: "Bajo" },
  { value: "MODERADO", label: "Moderado" },
  { value: "ALTO", label: "Alto" },
];

const REFERRAL_SOURCE_OPTIONS = [
  { value: "INICIATIVA_PROPIA", label: "Iniciativa propia" },
  { value: "MEDICO", label: "Médico" },
  { value: "PSIQUIATRA", label: "Psiquiatra" },
  { value: "PSICOTERAPEUTA", label: "Psicoterapeuta" },
  { value: "FAMILIAR", label: "Familiar" },
  { value: "AMIGO", label: "Amigo" },
  { value: "OTRO", label: "Otro" },
];

const TREATMENT_RESULT_OPTIONS = [
  { value: "RESUELTO", label: "Resuelto" },
  { value: "MEJORADO", label: "Mejorado" },
  { value: "INVARIABLE", label: "Invariable" },
  { value: "DROP_OUT", label: "Drop out" },
  { value: "OTRO", label: "Otro" },
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
        { id: "ahfEnfermedadesMentales", label: "Enfermedades mentales", type: "textarea", placeholder: "Antecedentes heredo-familiares de enfermedades mentales" },
        { id: "ahfEnfermedadesCronicas", label: "Enfermedades crónicas", type: "textarea", placeholder: "Antecedentes heredo-familiares de enfermedades crónicas" },
        { id: "ahfSuicidiosIntentos", label: "Suicidios/Intentos", type: "textarea", placeholder: "Antecedentes familiares de suicidios o intentos" },
        { id: "ahfAdicciones", label: "Adicciones", type: "textarea", placeholder: "Antecedentes familiares de adicciones" },
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
        { id: "lugarNacimiento", label: "Lugar de nacimiento", type: "text", placeholder: "Ciudad, estado, país" },
        { id: "estadoCivil", label: "Estado civil", type: "select", options: MARITAL_STATUS_OPTIONS },
        { id: "escolaridad", label: "Escolaridad", type: "select", options: EDUCATION_OPTIONS },
        { id: "ocupacion", label: "Ocupación", type: "text", placeholder: "Ocupación principal" },
        { id: "religion", label: "Religión", type: "text", placeholder: "Religión o afiliación religiosa" },
        { id: "calleNumero", label: "Calle y número", type: "text", placeholder: "Domicilio completo" },
        { id: "colonia", label: "Colonia", type: "text" },
        { id: "codigoPostal", label: "C.P.", type: "text", placeholder: "Código postal" },
        { id: "municipioDelegacion", label: "Municipio/Delegación", type: "text" },
        { id: "estadoDomicilio", label: "Estado", type: "select", options: MEXICAN_STATES },
        { 
          id: "tabaquismo", 
          label: "Tabaquismo (Sí/No)", 
          type: "yesno",
          helperText: "Si selecciona Sí, se habilitan campos de cantidad/tiempo"
        },
        { 
          id: "tabaquismoCantidad", 
          label: "Tabaquismo (Cantidad)", 
          type: "number",
          placeholder: "Cigarrillos/día",
          conditional: { field: "tabaquismo", value: "SI" }
        },
        { 
          id: "tabaquismoTiempo", 
          label: "Tabaquismo (Tiempo)", 
          type: "number",
          placeholder: "Años",
          conditional: { field: "tabaquismo", value: "SI" }
        },
        { 
          id: "indiceTabaquico", 
          label: "Índice tabáquico", 
          type: "readonly",
          computed: (formData) => {
            const cantidad = parseFloat(formData.tabaquismoCantidad) || 0;
            const tiempo = parseFloat(formData.tabaquismoTiempo) || 0;
            if (cantidad && tiempo) {
              return ((cantidad / 20) * tiempo).toFixed(2);
            }
            return "";
          }
        },
        { 
          id: "alcoholismo", 
          label: "Alcoholismo (Sí/No)", 
          type: "yesno",
          helperText: "Si selecciona Sí, se habilitan tipo de bebida y frecuencia"
        },
        { 
          id: "alcoholismoTipo", 
          label: "Alcoholismo (Tipo de bebida)", 
          type: "text",
          placeholder: "Ej. cerveza, vino, destilados, mixto",
          conditional: { field: "alcoholismo", value: "SI" }
        },
        { 
          id: "alcoholismoFrecuencia", 
          label: "Alcoholismo (Frecuencia)", 
          type: "select",
          options: ALCOHOL_FREQUENCY_OPTIONS,
          conditional: { field: "alcoholismo", value: "SI" }
        },
        { 
          id: "toxicomanias", 
          label: "Toxicomanías (Sí/No)", 
          type: "yesno",
          helperText: "Uso de sustancias distintas a tabaco/alcohol"
        },
        { 
          id: "toxicomaniasTipo", 
          label: "Toxicomanías (Tipo)", 
          type: "text",
          placeholder: "Tipo(s) de sustancia(s)",
          conditional: { field: "toxicomanias", value: "SI" }
        },
        { 
          id: "toxicomaniasFrecuencia", 
          label: "Toxicomanías (Frecuencia)", 
          type: "select",
          options: TOXICOMANIA_FREQUENCY_OPTIONS,
          conditional: { field: "toxicomanias", value: "SI" }
        },
        { 
          id: "actividadFisica", 
          label: "Actividad física (Sí/No)", 
          type: "yesno"
        },
        { 
          id: "tipoActividad", 
          label: "Tipo de actividad", 
          type: "text",
          placeholder: "Tipo de actividad física realizada",
          conditional: { field: "actividadFisica", value: "SI" }
        },
        { 
          id: "alimentacion", 
          label: "Alimentación", 
          type: "select",
          options: ALIMENTATION_OPTIONS
        },
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
        { id: "appMedicos", label: "Médicos", type: "textarea", placeholder: "Antecedentes personales patológicos médicos relevantes" },
        { id: "appQuirurgicos", label: "Quirúrgicos", type: "textarea", placeholder: "Antecedentes quirúrgicos relevantes" },
        { id: "appTraumaticos", label: "Traumáticos", type: "textarea", placeholder: "Antecedentes traumáticos relevantes" },
        { id: "appAlergicos", label: "Alérgicos", type: "textarea", placeholder: "Alergias reportadas" },
        { id: "appTransfusionales", label: "Transfusionales", type: "textarea", placeholder: "Antecedentes de transfusiones" },
        { id: "appHospitalizaciones", label: "Hospitalizaciones", type: "textarea", placeholder: "Hospitalizaciones previas" },
      ],
    },

    /* =====================================================
     * APSIC
     * ===================================================== */
    {
      sectionId: "apsic",
      title: "Antecedentes Psiquiátricos",
      fields: [
        { 
          id: "apsicFechaInicio", 
          label: "Fecha inicio", 
          type: "date", 
          required: true,
          helperText: "Fecha de inicio del proceso terapéutico. Se autocompleta con la fecha de creación/apertura del expediente, pero permite edición."
        },
        { 
          id: "apsicFuenteReferencia", 
          label: "Fuente de referencia", 
          type: "select",
          options: REFERRAL_SOURCE_OPTIONS
        },
        { 
          id: "apsicTratamientosPrevios", 
          label: "Tratamientos previos psicoterapéuticos (Sí/No)", 
          type: "yesno",
          helperText: "Si selecciona Sí, se habilita módulo repetible de tratamientos previos"
        },
        {
          id: "apsicTratamientosPreviosDetalle",
          label: "Tratamientos previos (detalle)",
          type: "list",
          repeatable: true,
          addLabel: "Agregar tratamiento previo",
          emptyMessage: "No hay tratamientos previos registrados",
          conditional: { field: "apsicTratamientosPrevios", value: "SI" },
          subfields: [
            { id: "enfoque", label: "Enfoque", type: "text", placeholder: "Enfoque del tratamiento" },
            { id: "duracion", label: "Duración", type: "text", placeholder: "Ej. 6 meses, 10 sesiones" },
            { id: "resultados", label: "Resultados", type: "select", options: TREATMENT_RESULT_OPTIONS },
          ],
        },
        { 
          id: "apsicFarmacosActuales", 
          label: "Fármacos actuales (Sí/No)", 
          type: "yesno",
          helperText: "Indica si actualmente toma cualquier fármaco (incluye psicofármacos)"
        },
        { 
          id: "apsicFarmacosActualesEspecificar", 
          label: "Fármacos actuales (Especificar)", 
          type: "textarea",
          placeholder: "Nombre, dosis, frecuencia, duración/desde cuándo",
          conditional: { field: "apsicFarmacosActuales", value: "SI" }
        },
      ],
    },

    /* =====================================================
     * EXAMEN MENTAL
     * ===================================================== */
    {
      sectionId: "examenMental",
      title: "Examen Mental",
      description: "Hallazgos del examen del estado mental",
      fields: [
        { id: "examenMentalAparienciaActitud", label: "Apariencia y actitud", type: "textarea", placeholder: "Hallazgos en apariencia y actitud" },
        { id: "examenMentalConciencia", label: "Conciencia", type: "textarea", placeholder: "Hallazgos en nivel de conciencia" },
        { id: "examenMentalOrientacion", label: "Orientación", type: "textarea", placeholder: "Hallazgos en orientación" },
        { id: "examenMentalAtencionConcentracion", label: "Atención y concentración", type: "textarea", placeholder: "Hallazgos en atención y concentración" },
        { id: "examenMentalMemoria", label: "Memoria", type: "textarea", placeholder: "Hallazgos en memoria" },
        { id: "examenMentalLenguaje", label: "Lenguaje", type: "textarea", placeholder: "Hallazgos en lenguaje" },
        { id: "examenMentalPensamiento", label: "Pensamiento", type: "textarea", placeholder: "Hallazgos en pensamiento" },
        { id: "examenMentalPercepcion", label: "Percepción", type: "textarea", placeholder: "Hallazgos en percepción" },
        { id: "examenMentalAfecto", label: "Afecto", type: "textarea", placeholder: "Hallazgos en afecto" },
        { id: "examenMentalJuicio", label: "Juicio", type: "textarea", placeholder: "Hallazgos en juicio" },
        { id: "examenMentalInsight", label: "Insight", type: "textarea", placeholder: "Hallazgos en insight" },
        { id: "examenMentalOtro", label: "Otro", type: "textarea", placeholder: "Otros hallazgos del examen mental" },
      ],
    },

    /* =====================================================
     * EVALUACIÓN DE RIESGO
     * ===================================================== */
    {
      sectionId: "evaluacionRiesgo",
      title: "Evaluación de Riesgo",
      description: "Evaluación de riesgos clínicos",
      fields: [
        { 
          id: "riesgoSuicida", 
          label: "Riesgo suicida", 
          type: "select",
          options: RISK_LEVEL_OPTIONS
        },
        { 
          id: "riesgoSuicidaEspecificar", 
          label: "Riesgo suicida (Especificar)", 
          type: "textarea",
          placeholder: "Detalle del riesgo suicida",
          conditional: { field: "riesgoSuicida", value: "AUSENTE", operator: "!=" }
        },
        { 
          id: "riesgoHeteroagresivo", 
          label: "Riesgo heteroagresivo", 
          type: "select",
          options: HETEROAGGRESSIVE_RISK_OPTIONS
        },
        { 
          id: "riesgoHeteroagresivoEspecificar", 
          label: "Riesgo heteroagresivo (Especificar)", 
          type: "textarea",
          placeholder: "Detalle del riesgo heteroagresivo",
          conditional: { field: "riesgoHeteroagresivo", value: "AUSENTE", operator: "!=" }
        },
        { 
          id: "otrosRiesgos", 
          label: "Otros riesgos", 
          type: "textarea",
          placeholder: "Otros riesgos identificados (ej. autoagresivo no suicida, vulnerabilidad, violencia, negligencia, etc.)"
        },
      ],
    },
  ],
};

export default HC_SCHEMA;