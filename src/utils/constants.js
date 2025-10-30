export const ROLES = {
  ADMIN: "ADMIN",
  PROFESSIONAL: "PROFESSIONAL",
  ASSISTANT: "ASSISTANT",
};

export const ROLES_LABEL = {
  [ROLES.ADMIN]: "Administrador",
  [ROLES.PROFESSIONAL]: "Profesional",
  [ROLES.ASSISTANT]: "Asistente",
};

export const ROUTES = {
  login: "/",
  register: "/register",
  dashboard: "/dashboard",
  patients: "/patients",
  sessions: "/sessions",
  consents: "/consents",
  prescriptions: "/prescriptions",
  reports: "/reports",
};

export const SESSION_STATUS = {
  PROGRAMADA: "programada",
  CONFIRMADA: "confirmada",
  ATENDIDA: "atendida",
  NO_PRESENTADA: "no_presentada",
  CANCELADA: "cancelada",
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

export default {
  ROLES,
  ROLES_LABEL,
  ROUTES,
  SESSION_STATUS,
  SESSION_STATUS_LABEL,
  SESSION_STATUS_VARIANT,
  CONSENT_TYPES,
  PRESCRIPTION_FIELDS,
};
