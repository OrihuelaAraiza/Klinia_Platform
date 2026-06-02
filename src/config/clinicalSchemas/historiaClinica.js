/**
 * Schemas de Historia Clínica por especialidad — alineados con NOM-004-SSA3-2012
 * y NOM-024-SSA3-2012.
 *
 * Cada schema define secciones con campos. Los campos comparten una estructura:
 *   { key, label, type: "text"|"textarea"|"date"|"number"|"select", options?,
 *     placeholder?, hint?, cols? (1 o 2) }
 *
 * Las claves se persisten en `extraFields` (Json) del modelo History; las que
 * coincidan con columnas reales del schema Prisma (motive, mentalStatusExam,
 * goals, therapeuticPlan…) se promueven a columnas para compatibilidad con
 * los buscadores y dashboards existentes.
 */

export const HISTORY_LEGAL_NOTICE =
  "El registro y resguardo de esta historia clínica cumple con la NOM-004-SSA3-2012 (expediente clínico) y la NOM-024-SSA3-2012 (sistemas de información de registro electrónico). El profesional firmante es responsable del contenido.";

// =====================================================================
//   1) HISTORIA CLÍNICA PSICOLÓGICA
// =====================================================================
export const HISTORIA_PSICOLOGICA = {
  type: "PSICOLOGICA",
  title: "Historia clínica psicológica",
  subtitle:
    "Evaluación integral del funcionamiento, antecedentes y personalidad. Conforme a NOM-004-SSA3-2012.",
  sections: [
    {
      id: "motivo",
      title: "Motivo de consulta",
      fields: [
        {
          key: "motive",
          label: "Motivo en palabras del paciente",
          type: "textarea",
          required: true,
          placeholder: "“Llevo meses sintiéndome muy ansiosa…”",
          cols: 2,
        },
      ],
    },
    {
      id: "padecimiento",
      title: "Padecimiento actual",
      hint: "Inicio, evolución, intensidad, frecuencia, factores precipitantes y de mantenimiento.",
      fields: [
        { key: "symptomOnset", label: "Inicio de los síntomas", type: "text" },
        { key: "padecimientoActual", label: "Descripción detallada", type: "textarea", cols: 2 },
      ],
    },
    {
      id: "apnp",
      title: "Antecedentes personales no patológicos",
      fields: [
        { key: "dietaryHabits", label: "Hábitos alimenticios", type: "textarea" },
        { key: "sleepPatterns", label: "Patrón de sueño", type: "textarea" },
        { key: "physicalActivity", label: "Actividad física", type: "textarea" },
        { key: "redDeApoyo", label: "Red de apoyo y recursos", type: "textarea" },
      ],
    },
    {
      id: "app",
      title: "Antecedentes personales patológicos",
      fields: [
        { key: "appMedicos", label: "Médicos / quirúrgicos", type: "textarea" },
        { key: "appPsicologicos", label: "Psicológicos / psiquiátricos previos", type: "textarea" },
        { key: "appSustancias", label: "Consumo de sustancias", type: "textarea" },
        { key: "previousTreatments", label: "Tratamientos previos y respuesta", type: "textarea" },
      ],
    },
    {
      id: "desarrollo",
      title: "Antecedentes del desarrollo",
      fields: [
        { key: "devPerinatales", label: "Perinatales (embarazo, parto)", type: "textarea" },
        { key: "devHitos", label: "Hitos del desarrollo psicomotor", type: "textarea" },
        { key: "devEscolar", label: "Historia escolar", type: "textarea" },
        { key: "devPsicosexual", label: "Historia psicosexual y de pareja", type: "textarea" },
        { key: "devLaboral", label: "Historia laboral", type: "textarea", cols: 2 },
      ],
    },
    {
      id: "ahf",
      title: "Antecedentes heredofamiliares",
      fields: [
        {
          key: "ahf",
          label: "Enfermedades médicas y psiquiátricas en la familia",
          type: "textarea",
          cols: 2,
        },
      ],
    },
    {
      id: "observacion",
      title: "Observación y exploración conductual",
      fields: [
        { key: "obsApariencia", label: "Apariencia y arreglo", type: "text" },
        { key: "obsActitud", label: "Actitud ante la entrevista", type: "text" },
        { key: "obsLenguaje", label: "Lenguaje", type: "text" },
        { key: "obsAfecto", label: "Afecto / estado de ánimo", type: "text" },
        { key: "obsOrientacion", label: "Orientación", type: "text" },
        { key: "obsAtencion", label: "Atención y memoria", type: "text" },
        { key: "obsOtras", label: "Otras observaciones", type: "textarea", cols: 2 },
      ],
    },
    {
      id: "pruebas",
      title: "Pruebas psicológicas aplicadas",
      hint: "Nombre del test, puntaje bruto/estandarizado e interpretación.",
      fields: [
        { key: "prueba1Nombre", label: "Instrumento 1", type: "text" },
        { key: "prueba1Result", label: "Puntaje / interpretación", type: "text" },
        { key: "prueba2Nombre", label: "Instrumento 2", type: "text" },
        { key: "prueba2Result", label: "Puntaje / interpretación", type: "text" },
        { key: "prueba3Nombre", label: "Instrumento 3", type: "text" },
        { key: "prueba3Result", label: "Puntaje / interpretación", type: "text" },
        { key: "pruebasSintesis", label: "Síntesis de resultados", type: "textarea", cols: 2 },
      ],
    },
    {
      id: "formulacion",
      title: "Formulación del caso",
      hint: "Factores predisponentes, precipitantes, perpetuantes y protectores.",
      fields: [{ key: "formulacion", label: "Integración", type: "textarea", cols: 2 }],
    },
    {
      id: "dx",
      title: "Impresión diagnóstica",
      fields: [
        {
          key: "mentalStatusExam",
          label: "Impresión diagnóstica (DSM-5-TR / CIE-11)",
          type: "textarea",
          cols: 2,
        },
        { key: "dxDiferenciales", label: "Diagnósticos diferenciales", type: "textarea", cols: 2 },
      ],
    },
    {
      id: "plan",
      title: "Plan, objetivos y pronóstico",
      fields: [
        { key: "therapeuticPlan", label: "Plan de evaluación / intervención", type: "textarea" },
        { key: "goals", label: "Objetivos terapéuticos", type: "textarea" },
        { key: "planCanalizaciones", label: "Canalizaciones", type: "textarea" },
        {
          key: "pronostico",
          label: "Pronóstico",
          type: "select",
          options: [
            { value: "", label: "—" },
            { value: "FAVORABLE", label: "Favorable" },
            { value: "RESERVADO", label: "Reservado" },
            { value: "DESFAVORABLE", label: "Desfavorable" },
          ],
        },
      ],
    },
  ],
};

// =====================================================================
//   2) HISTORIA CLÍNICA PSIQUIÁTRICA
// =====================================================================
export const HISTORIA_PSIQUIATRICA = {
  type: "PSIQUIATRICA",
  title: "Historia clínica psiquiátrica",
  subtitle:
    "Valoración médico-psiquiátrica, examen mental, riesgo y plan farmacológico. NOM-004-SSA3-2012.",
  sections: [
    {
      id: "motivo",
      title: "Motivo de consulta",
      fields: [
        { key: "informante", label: "Informante / acompañante", type: "text" },
        { key: "motive", label: "Motivo y quién refiere", type: "textarea", required: true, cols: 2 },
      ],
    },
    {
      id: "padecimiento",
      title: "Padecimiento actual",
      hint: "Síntomas, cronología, curso, gravedad y repercusión funcional.",
      fields: [
        { key: "symptomOnset", label: "Inicio de los síntomas", type: "text" },
        { key: "padecimientoActual", label: "Descripción", type: "textarea", cols: 2 },
      ],
    },
    {
      id: "antpsiq",
      title: "Antecedentes psiquiátricos",
      fields: [
        { key: "psiqEpisodios", label: "Episodios previos", type: "textarea" },
        { key: "psiqHosp", label: "Hospitalizaciones psiquiátricas", type: "textarea" },
        { key: "psiqSuicidio", label: "Intentos / ideación suicida previos", type: "textarea" },
        { key: "previousTreatments", label: "Tratamientos y respuesta (fármacos, dosis)", type: "textarea" },
      ],
    },
    {
      id: "antmed",
      title: "Antecedentes médicos",
      fields: [
        { key: "medCronicas", label: "Enfermedades crónicas / quirúrgicas", type: "textarea" },
        { key: "medActuales", label: "Medicación actual", type: "textarea" },
        { key: "medAlergias", label: "Alergias", type: "textarea" },
        { key: "medSustancias", label: "Consumo de sustancias", type: "textarea" },
      ],
    },
    {
      id: "ahf",
      title: "Antecedentes heredofamiliares",
      fields: [
        {
          key: "ahf",
          label: "Trastornos psiquiátricos y médicos en la familia",
          type: "textarea",
          cols: 2,
        },
      ],
    },
    {
      id: "expfisica",
      title: "Exploración física y signos vitales",
      fields: [
        { key: "efTA", label: "T/A", type: "text" },
        { key: "efFC", label: "FC", type: "text" },
        { key: "efFR", label: "FR", type: "text" },
        { key: "efTemp", label: "Temp", type: "text" },
        { key: "efPeso", label: "Peso", type: "text" },
        { key: "efTalla", label: "Talla", type: "text" },
        { key: "efIMC", label: "IMC", type: "text" },
        { key: "efSatO2", label: "Sat O₂", type: "text" },
        { key: "efHallazgos", label: "Hallazgos relevantes", type: "textarea", cols: 2 },
      ],
    },
    {
      id: "examenMental",
      title: "Examen mental",
      fields: [
        { key: "emAspecto", label: "Aspecto y actitud", type: "text" },
        { key: "emOrientacion", label: "Conciencia / orientación", type: "text" },
        { key: "emAtencion", label: "Atención", type: "text" },
        { key: "emLenguaje", label: "Lenguaje", type: "text" },
        { key: "emAnimo", label: "Estado de ánimo", type: "text" },
        { key: "emAfecto", label: "Afecto", type: "text" },
        { key: "emCurso", label: "Pensamiento (curso)", type: "text" },
        { key: "emContenido", label: "Pensamiento (contenido)", type: "text" },
        { key: "emSenso", label: "Sensopercepción", type: "text" },
        { key: "emMemoria", label: "Memoria", type: "text" },
        { key: "emJuicio", label: "Juicio", type: "text" },
        { key: "emInsight", label: "Introspección (insight)", type: "text" },
      ],
    },
    {
      id: "riesgo",
      title: "Evaluación de riesgo",
      hint:
        "Documentar presencia O ausencia de ideación suicida y de daño a terceros en CADA valoración.",
      fields: [
        {
          key: "riesgoSuicida",
          label: "Riesgo suicida",
          type: "select",
          options: [
            { value: "", label: "—" },
            { value: "AUSENTE", label: "Ausente" },
            { value: "PASIVO", label: "Ideación pasiva (sin plan)" },
            { value: "ACTIVO", label: "Ideación activa (con plan)" },
          ],
        },
        {
          key: "riesgoHeteroagresivo",
          label: "Riesgo de daño a terceros",
          type: "select",
          options: [
            { value: "", label: "—" },
            { value: "AUSENTE", label: "Ausente" },
            { value: "PRESENTE", label: "Presente" },
          ],
        },
        { key: "riesgoDetalle", label: "Detalle y medidas tomadas", type: "textarea", cols: 2 },
      ],
    },
    {
      id: "estudios",
      title: "Estudios complementarios",
      fields: [
        {
          key: "estudios",
          label: "Laboratorio, gabinete, escalas y resultados",
          type: "textarea",
          cols: 2,
        },
      ],
    },
    {
      id: "dx",
      title: "Diagnóstico",
      fields: [
        {
          key: "mentalStatusExam",
          label: "Diagnóstico (DSM-5-TR / CIE-11) con especificadores",
          type: "textarea",
          cols: 2,
        },
        { key: "dxDiferenciales", label: "Diagnósticos diferenciales", type: "textarea", cols: 2 },
      ],
    },
    {
      id: "plan",
      title: "Plan terapéutico y pronóstico",
      fields: [
        {
          key: "therapeuticPlan",
          label: "Plan farmacológico (fármaco, dosis, vía, frecuencia)",
          type: "textarea",
        },
        { key: "planNoFarma", label: "No farmacológico / psicoterapia", type: "textarea" },
        { key: "planSeguimiento", label: "Indicaciones y seguimiento", type: "textarea" },
        { key: "goals", label: "Objetivos terapéuticos", type: "textarea" },
        {
          key: "pronostico",
          label: "Pronóstico",
          type: "select",
          options: [
            { value: "", label: "—" },
            { value: "FAVORABLE", label: "Favorable" },
            { value: "RESERVADO", label: "Reservado" },
            { value: "DESFAVORABLE", label: "Desfavorable" },
          ],
        },
      ],
    },
  ],
};

// =====================================================================
//   3) REGISTRO PSICOTERAPÉUTICO
// =====================================================================
export const HISTORIA_PSICOTERAPEUTICA = {
  type: "PSICOTERAPEUTICA",
  title: "Registro psicoterapéutico",
  subtitle:
    "Encuadre, plan de tratamiento y evolución del proceso. NOM-004-SSA3-2012.",
  sections: [
    {
      id: "proceso",
      title: "Datos del proceso",
      fields: [
        {
          key: "enfoque",
          label: "Enfoque",
          type: "select",
          options: [
            { value: "", label: "—" },
            { value: "CBT", label: "Cognitivo-conductual" },
            { value: "HUMANISTA", label: "Humanista" },
            { value: "SISTEMICO", label: "Sistémico" },
            { value: "PSICODINAMICO", label: "Psicoanalítico / Psicodinámico" },
            { value: "INTEGRATIVO", label: "Integrativo" },
            { value: "OTRO", label: "Otro" },
          ],
        },
        {
          key: "modalidad",
          label: "Modalidad",
          type: "select",
          options: [
            { value: "", label: "—" },
            { value: "INDIVIDUAL", label: "Individual" },
            { value: "PAREJA", label: "Pareja" },
            { value: "FAMILIAR", label: "Familiar" },
            { value: "GRUPAL", label: "Grupal" },
          ],
        },
      ],
    },
    {
      id: "encuadre",
      title: "Encuadre inicial",
      fields: [
        { key: "encFrecuencia", label: "Frecuencia de sesiones", type: "text" },
        { key: "encDuracion", label: "Duración por sesión", type: "text" },
        { key: "encHonorarios", label: "Honorarios", type: "text" },
        { key: "encCancelacion", label: "Política de cancelación", type: "text" },
        { key: "encReglas", label: "Acuerdos y reglas del encuadre", type: "textarea", cols: 2 },
      ],
    },
    {
      id: "motivo",
      title: "Motivo de la psicoterapia",
      fields: [
        { key: "motive", label: "Motivo y demanda", type: "textarea", required: true, cols: 2 },
      ],
    },
    {
      id: "plan",
      title: "Plan de tratamiento",
      hint: "Definir objetivos medibles permite evaluar avance sesión a sesión.",
      fields: [
        { key: "goals", label: "Objetivos generales (medibles)", type: "textarea", cols: 2 },
        { key: "therapeuticPlan", label: "Fases del tratamiento", type: "textarea", cols: 2 },
        { key: "planIndicadores", label: "Indicadores de avance / medición", type: "textarea", cols: 2 },
      ],
    },
    {
      id: "evolucion",
      title: "Evolución general",
      fields: [
        { key: "evolAvances", label: "Avances respecto a objetivos", type: "textarea" },
        { key: "evolDificultades", label: "Dificultades / obstáculos", type: "textarea" },
        { key: "vinculo", label: "Estado del vínculo terapéutico", type: "textarea", cols: 2 },
      ],
    },
    {
      id: "riesgo",
      title: "Eventos críticos / riesgo",
      hint:
        "Ante indicios de riesgo, registrar lo observado, las acciones tomadas y la derivación correspondiente.",
      fields: [
        {
          key: "riesgoEventos",
          label: "Estado de riesgo",
          type: "select",
          options: [
            { value: "", label: "—" },
            { value: "SIN_EVENTOS", label: "Sin eventos de riesgo" },
            { value: "EXPLORADO", label: "Ideación suicida explorada — sin riesgo activo" },
            { value: "PROTOCOLO", label: "Riesgo detectado → protocolo activado" },
            { value: "DERIVACION", label: "Derivación a valoración psiquiátrica" },
          ],
        },
        { key: "riesgoDetalle", label: "Detalle", type: "textarea", cols: 2 },
      ],
    },
    {
      id: "cierre",
      title: "Cierre / alta",
      fields: [
        {
          key: "cierreTipo",
          label: "Tipo de cierre",
          type: "select",
          options: [
            { value: "", label: "— En proceso" },
            { value: "OBJETIVOS_CUMPLIDOS", label: "Alta por objetivos cumplidos" },
            { value: "MUTUO_ACUERDO", label: "Cierre por mutuo acuerdo" },
            { value: "ABANDONO", label: "Abandono" },
            { value: "DERIVACION", label: "Derivación" },
            { value: "OTRO", label: "Otro" },
          ],
        },
        { key: "cierreResumen", label: "Resumen del proceso y logros", type: "textarea", cols: 2 },
        { key: "cierreRecomendaciones", label: "Recomendaciones y seguimiento", type: "textarea", cols: 2 },
      ],
    },
  ],
};

// =====================================================================
//   4) HISTORIA CLÍNICA PALIATIVA (Cuidados Paliativos / Tanatología)
//   Valoración integral: física, psicológica, social y espiritual.
//   Conforme a NOM-004-SSA3-2012 y normatividad de cuidados paliativos.
// =====================================================================

export const HISTORIA_SCHEMAS = {
  PSICOLOGICA: HISTORIA_PSICOLOGICA,
  PSIQUIATRICA: HISTORIA_PSIQUIATRICA,
  PSICOTERAPEUTICA: HISTORIA_PSICOTERAPEUTICA,
};

export function getHistoriaSchema(type) {
  return HISTORIA_SCHEMAS[type] || HISTORIA_PSICOLOGICA;
}
