/**
 * Helpers de permisos finos basados en role + specialty.
 *
 * Single source of truth para decisiones de UI gating:
 * - Habilitar/deshabilitar botones de "Emitir prescripción"
 * - Mostrar/ocultar templates de reportes restringidos
 * - Mensajes explicativos cuando algo está bloqueado
 *
 * Para auditoría / seguridad real, replicar el mismo check del lado del backend.
 */

import { ROLES, SPECIALTIES, SPECIALTY_LABELS } from "./constants";

export function getSpecialty(user) {
  return user?.specialty || null;
}

export function getSpecialtyLabel(user) {
  const s = getSpecialty(user);
  return s ? SPECIALTY_LABELS[s] || s : null;
}

export function isProfessional(user) {
  return user?.role === ROLES.PROFESSIONAL;
}

export function isAdmin(user) {
  return user?.role === ROLES.ADMIN;
}

/**
 * Puede prescribir psicofármacos.
 * Solo psiquiatras (y admin como excepción operativa).
 */
export function canPrescribe(user) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (!isProfessional(user)) return false;
  return getSpecialty(user) === SPECIALTIES.PSIQUIATRA;
}

/**
 * Puede emitir el Reporte Psiquiátrico (constancia clínica con datos farmacológicos).
 * Mismo gate que la prescripción.
 */
export function canEmitPsychiatricReport(user) {
  return canPrescribe(user);
}

/**
 * Razón legible por la cual no puede prescribir (para tooltips/banners).
 */
export function whyCannotPrescribe(user) {
  if (!user) return "Inicia sesión para acceder a esta función.";
  if (user.role === ROLES.ASSISTANT) {
    return "Tu rol de asistente no permite emitir recetas. Solicítaselo al profesional responsable.";
  }
  if (user.role === ROLES.PATIENT) {
    return "Las recetas solo pueden emitirlas profesionales con cédula médica.";
  }
  const specialty = getSpecialty(user);
  if (!specialty) {
    return "Tu perfil profesional no tiene especialidad asignada. Solicita al administrador que la configure.";
  }
  if (specialty === SPECIALTIES.PSICOLOGO) {
    return "Los psicólogos no están autorizados para prescribir psicofármacos. Solo los psiquiatras pueden emitir recetas.";
  }
  if (specialty === SPECIALTIES.PSICOTERAPEUTA) {
    return "Los psicoterapeutas no pueden emitir recetas, salvo que también sean médicos psiquiatras. Actualiza tu especialidad si corresponde.";
  }
  return "Tu especialidad actual no permite emitir recetas.";
}

/**
 * Verifica si el usuario cumple con la especialidad mínima requerida por un template.
 */
export function canUseTemplate(user, template) {
  if (!template) return false;
  if (!template.requiredSpecialty) return true;
  if (isAdmin(user)) return true;
  return getSpecialty(user) === template.requiredSpecialty;
}

export default {
  getSpecialty,
  getSpecialtyLabel,
  isProfessional,
  isAdmin,
  canPrescribe,
  canEmitPsychiatricReport,
  whyCannotPrescribe,
  canUseTemplate,
};
