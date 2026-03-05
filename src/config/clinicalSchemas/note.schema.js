/**
 * Nota de Evolución Schema
 * Schema-driven configuration for clinical notes form
 * Based on Excel: "Maquetado de campos por sección HC y Nota"
 */

const SCALE_TYPE_OPTIONS = [
  { value: "HAMILTON_ANSIEDAD", label: "Hamilton - Ansiedad" },
  { value: "HAMILTON_DEPRESION", label: "Hamilton - Depresión" },
  { value: "BECK_DEPRESION", label: "Beck - Depresión" },
  { value: "BECK_ANSIEDAD", label: "Beck - Ansiedad" },
  { value: "GAD7", label: "GAD-7" },
  { value: "PHQ9", label: "PHQ-9" },
  { value: "MMSE", label: "MMSE" },
  { value: "MOCA", label: "MoCA" },
  { value: "OTRO", label: "Otro" },
];

const MEDICATION_ROUTE_OPTIONS = [
  { value: "ORAL", label: "Oral" },
  { value: "INTRAMUSCULAR", label: "Intramuscular" },
  { value: "INTRAVENOSA", label: "Intravenosa" },
  { value: "SUBLINGUAL", label: "Sublingual" },
  { value: "TOPICA", label: "Tópica" },
  { value: "OTRO", label: "Otro" },
];

const MEDICATION_FREQUENCY_OPTIONS = [
  { value: "UNA_VEZ_DIA", label: "Una vez al día" },
  { value: "DOS_VECES_DIA", label: "Dos veces al día" },
  { value: "TRES_VECES_DIA", label: "Tres veces al día" },
  { value: "CUATRO_VECES_DIA", label: "Cuatro veces al día" },
  { value: "CADA_8_HORAS", label: "Cada 8 horas" },
  { value: "CADA_12_HORAS", label: "Cada 12 horas" },
  { value: "SEGUN_SE_NECESITE", label: "Según se necesite" },
  { value: "OTRO", label: "Otro" },
];

const REFERRAL_TYPE_OPTIONS = [
  { value: "INTERNA", label: "Interconsulta interna" },
  { value: "EXTERNA", label: "Referencia externa" },
  { value: "URGENCIA", label: "Urgencia" },
];

export const NOTE_SCHEMA = {
  sections: [
    {
      sectionId: "identificacion",
      title: "Identificación",
      description: "Datos del paciente y profesional",
      fields: [
        {
          id: "paciente_nombre",
          label: "Paciente",
          type: "readonly",
          computed: (formData, context) => {
            return context?.patient ? `${context.patient.firstName} ${context.patient.lastName}`.trim() : "";
          },
        },
        {
          id: "paciente_edad",
          label: "Edad",
          type: "readonly",
          computed: (formData, context) => {
            if (!context?.patient?.birthDate) return "";
            const today = new Date();
            const birth = new Date(context.patient.birthDate);
            let age = today.getFullYear() - birth.getFullYear();
            const monthDiff = today.getMonth() - birth.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
              age--;
            }
            return `${age} años`;
          },
        },
        {
          id: "paciente_sexo",
          label: "Sexo",
          type: "readonly",
          computed: (formData, context) => {
            const genderMap = { M: "Masculino", F: "Femenino", X: "No especificado" };
            return genderMap[context?.patient?.gender] || "";
          },
        },
        {
          id: "fecha_hora_elaboracion",
          label: "Fecha y hora de elaboración",
          type: "readonly",
          computed: (formData, context) => {
            return context?.datetime ? new Date(context.datetime).toLocaleString("es-MX") : new Date().toLocaleString("es-MX");
          },
        },
        {
          id: "profesional_responsable",
          label: "Profesional responsable",
          type: "readonly",
          computed: (formData, context) => {
            return context?.professional?.name || "";
          },
        },
        {
          id: "cedula_profesional",
          label: "Cédula profesional",
          type: "readonly",
          computed: (formData, context) => {
            return context?.professional?.license || context?.user?.license || "";
          },
        },
      ],
    },
    {
      sectionId: "soap",
      title: "SOAP",
      description: "Subjetivo, Objetivo, Análisis, Plan",
      fields: [
        {
          id: "subjective",
          label: "S - Subjetivo",
          type: "textarea",
          required: true,
          placeholder: "Información proporcionada por el paciente, síntomas subjetivos, quejas principales",
          rows: 5,
        },
        {
          id: "objective",
          label: "O - Objetivo",
          type: "textarea",
          required: true,
          placeholder: "Hallazgos objetivos, observaciones clínicas, signos",
          rows: 5,
        },
        {
          id: "analysis",
          label: "A - Análisis / Formulación",
          type: "textarea",
          required: true,
          placeholder: "Análisis de la información, formulación clínica, interpretación",
          rows: 5,
        },
        {
          id: "plan",
          label: "P - Plan",
          type: "textarea",
          required: true,
          placeholder: "Plan de tratamiento, intervenciones, seguimiento",
          rows: 5,
        },
      ],
    },
    {
      sectionId: "escalas",
      title: "Escalas Aplicadas",
      description: "Escalas de evaluación psicológica/psiquiátrica",
      fields: [
        {
          id: "escalas_aplicadas",
          label: "Escalas",
          type: "list",
          repeatable: true,
          addLabel: "Agregar escala",
          emptyMessage: "No se aplicaron escalas",
          subfields: [
            {
              id: "tipo_escala",
              label: "Tipo de escala",
              type: "select",
              required: true,
              options: SCALE_TYPE_OPTIONS,
            },
            {
              id: "tipo_escala_otro",
              label: "Especificar otro tipo",
              type: "text",
              conditional: {
                field: "tipo_escala",
                value: "OTRO",
              },
              placeholder: "Nombre de la escala",
            },
            {
              id: "puntuacion",
              label: "Puntuación",
              type: "number",
              placeholder: "Puntuación obtenida",
            },
            {
              id: "interpretacion",
              label: "Interpretación",
              type: "textarea",
              placeholder: "Interpretación de resultados",
              rows: 2,
            },
            {
              id: "fecha_aplicacion",
              label: "Fecha de aplicación",
              type: "date",
            },
            {
              id: "archivos_soporte",
              label: "Archivos de soporte",
              type: "file",
              multiple: true,
              accept: "application/pdf,image/jpeg,image/jpg,image/png",
              maxSize: 5 * 1024 * 1024,
              helperText: "Adjunta evidencia de la escala (PDF/JPG/PNG, máx. 5MB por archivo)",
            },
          ],
        },
      ],
    },
    {
      sectionId: "diagnoses",
      title: "Diagnósticos",
      description: "Diagnósticos clínicos (CIE-10)",
      fields: [
        {
          id: "diagnosticos",
          label: "Diagnósticos",
          type: "list",
          repeatable: true,
          addLabel: "Agregar diagnóstico",
          emptyMessage: "No hay diagnósticos registrados",
          subfields: [
            {
              id: "codigo",
              label: "Código CIE-10",
              type: "text",
              required: true,
              placeholder: "Ej: F32.1",
            },
            {
              id: "descripcion",
              label: "Descripción",
              type: "text",
              required: true,
              placeholder: "Descripción del diagnóstico",
            },
            {
              id: "tipo",
              label: "Tipo",
              type: "select",
              options: [
                { value: "PRINCIPAL", label: "Principal" },
                { value: "SECUNDARIO", label: "Secundario" },
                { value: "DIFERENCIAL", label: "Diferencial" },
              ],
            },
            {
              id: "observaciones",
              label: "Observaciones",
              type: "textarea",
              placeholder: "Observaciones adicionales",
              rows: 2,
            },
          ],
        },
      ],
    },
    {
      sectionId: "medicacion",
      title: "Medicación Indicada",
      description: "Medicamentos prescritos en esta nota",
      fields: [
        {
          id: "medicacion_indicada",
          label: "Medicamentos",
          type: "list",
          repeatable: true,
          addLabel: "Agregar medicamento",
          emptyMessage: "No se indicó medicación",
          subfields: [
            {
              id: "medicamento",
              label: "Medicamento",
              type: "text",
              required: true,
              placeholder: "Nombre del medicamento",
            },
            {
              id: "principio_activo",
              label: "Principio activo",
              type: "text",
              placeholder: "Principio activo",
            },
            {
              id: "dosis",
              label: "Dosis",
              type: "text",
              required: true,
              placeholder: "Ej: 50mg",
            },
            {
              id: "via",
              label: "Vía de administración",
              type: "select",
              required: true,
              options: MEDICATION_ROUTE_OPTIONS,
            },
            {
              id: "frecuencia",
              label: "Frecuencia",
              type: "select",
              required: true,
              options: MEDICATION_FREQUENCY_OPTIONS,
            },
            {
              id: "frecuencia_otro",
              label: "Especificar otra frecuencia",
              type: "text",
              conditional: {
                field: "frecuencia",
                value: "OTRO",
              },
              placeholder: "Ej: Cada 6 horas",
            },
            {
              id: "duracion",
              label: "Duración",
              type: "text",
              placeholder: "Ej: 30 días, hasta nueva indicación",
            },
            {
              id: "indicaciones",
              label: "Indicaciones especiales",
              type: "textarea",
              placeholder: "Instrucciones adicionales para el paciente",
              rows: 2,
            },
          ],
        },
      ],
    },
    {
      sectionId: "referencia",
      title: "Referencia / Interconsulta",
      description: "Referencias a otros profesionales o servicios",
      fields: [
        {
          id: "tiene_referencia",
          label: "¿Se realiza referencia o interconsulta?",
          type: "yesno",
        },
        {
          id: "tipo_referencia",
          label: "Tipo de referencia",
          type: "select",
          conditional: {
            field: "tiene_referencia",
            value: "SI",
          },
          options: REFERRAL_TYPE_OPTIONS,
        },
        {
          id: "especialidad",
          label: "Especialidad o servicio",
          type: "text",
          conditional: {
            field: "tiene_referencia",
            value: "SI",
          },
          placeholder: "Ej: Psiquiatría, Neurología",
        },
        {
          id: "motivo_referencia",
          label: "Motivo de referencia",
          type: "textarea",
          conditional: {
            field: "tiene_referencia",
            value: "SI",
          },
          placeholder: "Razón de la referencia",
          rows: 3,
        },
        {
          id: "profesional_referido",
          label: "Profesional o institución referida",
          type: "text",
          conditional: {
            field: "tiene_referencia",
            value: "SI",
          },
          placeholder: "Nombre del profesional o institución",
        },
      ],
    },
    {
      sectionId: "seguimiento",
      title: "Seguimiento",
      description: "Plan de seguimiento y próximas citas",
      fields: [
        {
          id: "proxima_cita",
          label: "Próxima cita",
          type: "datetime",
          placeholder: "Fecha y hora de próxima cita",
        },
        {
          id: "intervalo_seguimiento",
          label: "Intervalo de seguimiento",
          type: "text",
          placeholder: "Ej: Semanal, quincenal, mensual",
        },
        {
          id: "objetivos_seguimiento",
          label: "Objetivos de seguimiento",
          type: "textarea",
          placeholder: "Qué se evaluará en el seguimiento",
          rows: 3,
        },
        {
          id: "recomendaciones",
          label: "Recomendaciones",
          type: "textarea",
          placeholder: "Recomendaciones generales para el paciente",
          rows: 3,
        },
      ],
    },
    {
      sectionId: "adjuntos",
      title: "Adjuntos",
      description: "Documentos y archivos relacionados",
      fields: [
        {
          id: "adjuntos",
          label: "Archivos adjuntos",
          type: "file",
          multiple: true,
          accept: "application/pdf,image/jpeg,image/jpg,image/png",
          maxSize: 5 * 1024 * 1024, // 5MB
          helperText: "Formatos permitidos: PDF, JPG, PNG (máx. 5MB por archivo)",
        },
      ],
    },
  ],
};

export default NOTE_SCHEMA;


