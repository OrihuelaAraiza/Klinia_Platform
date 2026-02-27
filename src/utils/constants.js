export const ROLES = {
  ADMIN: "ADMIN",
  PROFESSIONAL: "PROFESSIONAL",
  ASSISTANT: "ASSISTANT",
  PATIENT: "PATIENT",
};

export const ROLES_LABEL = {
  [ROLES.ADMIN]: "Administrador",
  [ROLES.PROFESSIONAL]: "Profesional",
  [ROLES.ASSISTANT]: "Asistente",
  [ROLES.PATIENT]: "Paciente",
};
export const DISCHARGE_REASONS = [
  { value: "OBJETIVOS_CUMPLIDOS", label: "Objetivos cumplidos" },
  { value: "ALTA_VOLUNTARIA", label: "Alta voluntaria" },
  { value: "ABANDONO", label: "Abandono / Deserción" },
  { value: "REFERENCIA", label: "Referencia a otro especialista" },
  { value: "OTRO", label: "Otro" },
];

export const CASE_RESULTS = [
  { value: "RESUELTO", label: "Caso resuelto" },
  { value: "MEJORADO", label: "Caso mejorado" },
  { value: "EMPEORADO", label: "Caso empeorado" },
  { value: "DROP_OUT", label: "Drop out (Abandono)" },
];


export const EVOLUCION_TEMPORAL = ["Progresivo", "Agudo", "Crónico", "Episódico"];
export const PRONOSTICO = ["Excelente", "Bueno", "Reservado", "Malo"];
export const TIPO_INDICACION = ["Paradójico", "Contradictorio", "Informativo"];
export const CRITERIO_EVALUACION = [
    "Mejoría significativa", 
    "Mejoría leve", 
    "Sin cambios", 
    "Empeoramiento", 
    "Nuevo patrón", 
    "Recaída"
];
export const DIMENSIONES_SPR = ["Percepción", "Pensamientos", "Sensaciones", "Reacciones", "Síntomas", "Crisis"];
export const AREAS_YO = ["Cuerpo", "Estudio", "Trabajo", "Deporte", "Situacional"];
export const AREAS_DEMAS = ["Pareja", "Hijos", "Amigos", "Familia origen", "Familia política"];
export const AREAS_MUNDO = ["Sociedad", "Situacional"];

export const CIVIL_STATUS_OPTIONS = [
  { value: "SOLTERO", label: "Soltero/a" },
  { value: "CASADO", label: "Casado/a" },
  { value: "DIVORCIADO", label: "Divorciado/a" },
  { value: "VIUDO", label: "Viudo/a" },
  { value: "UNION_LIBRE", label: "Unión Libre" },
];


export const EDUCATION_OPTIONS = [
  { value: "PRIMARIA", label: "Primaria" },
  { value: "SECUNDARIA", label: "Secundaria" },
  { value: "PREPARATORIA", label: "Preparatoria/Bachillerato" },
  { value: "LICENCIATURA", label: "Licenciatura/Ingeniería" },
  { value: "POSGRADO", label: "Posgrado (Maestría/Doctorado)" },
  { value: "NINGUNO", label: "Sin estudios formales" },
];

export const RELIGION_OPTIONS = [
  { value: "CATOLICA", label: "Católica" },
  { value: "CRISTIANA", label: "Cristiana" },
  { value: "TESTIGO_JEHOVA", label: "Testigo de Jehová" },
  { value: "MORMON", label: "Mormón" },
  { value: "JUDIA", label: "Judía" },
  { value: "OTRA", label: "Otra" },
  { value: "NINGUNA", label: "Ninguna / Ateísmo" },
];

export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  dashboard: "/dashboard",
  patients: "/patients",
  sessions: "/sessions",
  sessionsCalendar: "/sessions/calendar",
  consents: "/consents",
  prescriptions: "/prescriptions",
  prescriptionsNew: "/prescriptions/new",
  prescriptionDetail: "/prescriptions/:id",
  reports: "/reports",
  orderNew: "/patients/:patientId/orders/new",
  orderDetail: "/patients/:patientId/orders/:orderId",
  reportNew: "/patients/:patientId/reports/new",
  reportDetail: "/patients/:patientId/reports/:reportId",
  supervision: "/supervision",
  // Patient routes
  patientDashboard: "/patient/dashboard",
  patientClinicalHistory: "/patient/clinical-history",
  patientNotes: "/patient/notes",
  patientSessions: "/patient/sessions",
  patientPrescriptions: "/patient/prescriptions",
  patientDocuments: "/patient/documents",
  patientProfile: "/patient/profile",
  DisblePatient: "/patients/:id/discharge",
};

export const SESSION_STATUS = {
    PROGRAMADA: "SCHEDULED", 
    CONFIRMADA: "CONFIRMED", 
    ATENDIDA: "COMPLETED",
    NO_PRESENTADA: "NO_SHOW",
    CANCELADA: "CANCELLED", 
};

export const SESSION_STATUS_LABEL = {
  [SESSION_STATUS.PROGRAMADA]: "Programada",
  [SESSION_STATUS.CONFIRMADA]: "Confirmada",
  [SESSION_STATUS.ATENDIDA]: "Atendida",
  [SESSION_STATUS.NO_PRESENTADA]: "No presentada",
  [SESSION_STATUS.CANCELADA]: "Cancelada",
};

export const SESSION_STATUS_VARIANT = {
  [SESSION_STATUS.PROGRAMADA]: "neutral",
  [SESSION_STATUS.CONFIRMADA]: "info",
  [SESSION_STATUS.ATENDIDA]: "success",
  [SESSION_STATUS.NO_PRESENTADA]: "warning",
  [SESSION_STATUS.CANCELADA]: "danger",
};

export const SESSION_MODALITY = {
  IN_PERSON: "IN_PERSON",   
  TELEMEDICINE: "TELEMEDICINE", 
};

export const SESSION_MODALITY_LABEL = {
  [SESSION_MODALITY.IN_PERSON]: "Presencial",
  [SESSION_MODALITY.TELEMEDICINE]: "Virtual",
}

export const CONSENT_TYPES = {
  ATTENTION: "attention",
  RECORDING: "recording",
  AI_USE: "ai_use",
};

export const PRESCRIPTION_FIELDS = [
  { name: "substance", label: "Principio activo" },
  { name: "form", label: "Forma" },
  { name: "dose", label: "Dosis" },
  { name: "route", label: "Vía" },
  { name: "frequency", label: "Frecuencia" },
  { name: "duration", label: "Duración" },
  { name: "notes", label: "Indicaciones" },
];

export const MEXICAN_STATES = [
  { value: "AGUASCALIENTES", label: "Aguascalientes" },
  { value: "BAJA_CALIFORNIA", label: "Baja California" },
  { value: "BAJA_CALIFORNIA_SUR", label: "Baja California Sur" },
  { value: "CAMPECHE", label: "Campeche" },
  { value: "COAHUILA", label: "Coahuila" },
  { value: "COLIMA", label: "Colima" },
  { value: "CHIAPAS", label: "Chiapas" },
  { value: "CHIHUAHUA", label: "Chihuahua" },
  { value: "CIUDAD_DE_MEXICO", label: "Ciudad de Mexico" },
  { value: "DURANGO", label: "Durango" },
  { value: "GUANAJUATO", label: "Guanajuato" },
  { value: "GUERRERO", label: "Guerrero" },
  { value: "HIDALGO", label: "Hidalgo" },
  { value: "JALISCO", label: "Jalisco" },
  { value: "MEXICO", label: "Estado de Mexico" },
  { value: "MICHOACAN", label: "Michoacan" },
  { value: "MORELOS", label: "Morelos" },
  { value: "NAYARIT", label: "Nayarit" },
  { value: "NUEVO_LEON", label: "Nuevo Leon" },
  { value: "OAXACA", label: "Oaxaca" },
  { value: "PUEBLA", label: "Puebla" },
  { value: "QUERETARO", label: "Queretaro" },
  { value: "QUINTANA_ROO", label: "Quintana Roo" },
  { value: "SAN_LUIS_POTOSI", label: "San Luis Potosi" },
  { value: "SINALOA", label: "Sinaloa" },
  { value: "SONORA", label: "Sonora" },
  { value: "TABASCO", label: "Tabasco" },
  { value: "TAMAULIPAS", label: "Tamaulipas" },
  { value: "TLAXCALA", label: "Tlaxcala" },
  { value: "VERACRUZ", label: "Veracruz" },
  { value: "YUCATAN", label: "Yucatan" },
  { value: "ZACATECAS", label: "Zacatecas" },
];

export default {
  ROLES,
  ROLES_LABEL,
  ROUTES,
  SESSION_STATUS,
  SESSION_STATUS_LABEL,
  SESSION_STATUS_VARIANT,
  SESSION_MODALITY,
  SESSION_MODALITY_LABEL,
  CONSENT_TYPES,
  PRESCRIPTION_FIELDS,
  MEXICAN_STATES,
};

export function resolveDestination(role) {
  switch (role) {
  case ROLES.ADMIN:
    return ROUTES.dashboard;
  case ROLES.PROFESSIONAL:
  case ROLES.ASSISTANT:
    return ROUTES.patients;
  case ROLES.PATIENT:
    return ROUTES.patientDashboard;
  default:
    return ROUTES.dashboard;
}


}
