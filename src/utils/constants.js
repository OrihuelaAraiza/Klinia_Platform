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

export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
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
  PRESENCIAL: "presencial",
  VIRTUAL: "virtual",
};

export const SESSION_MODALITY_LABEL = {
  [SESSION_MODALITY.PRESENCIAL]: "Presencial",
  [SESSION_MODALITY.VIRTUAL]: "Virtual",
};

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
    return "/patient/dashboard"; // Ruta del paciente
  default:
    return ROUTES.dashboard;
}
}
