import { SESSION_MODALITY_LABEL, SESSION_STATUS } from "./constants";

export function getSessionPatientName(session) {
  return (
    session?.patient?.name ||
    session?.patientName ||
    session?.patientFullName ||
    session?.patientId ||
    "—"
  );
}

export function formatSessionLocation(session) {
  if (!session?.location) {
    return "";
  }
  if (session.modality === "virtual") {
    try {
      const url = new URL(session.location);
      return url.hostname;
    } catch {
      return session.location;
    }
  }
  return session.location;
}

export function formatSessionModality(session) {
  const label = SESSION_MODALITY_LABEL[session?.modality] || "—";
  const locationLabel = formatSessionLocation(session);
  return locationLabel ? `${label} · ${locationLabel}` : label;
}

export function canCreateSessionNote(session, isAssistant) {
  return (
    !isAssistant &&
    session?.status === SESSION_STATUS.CONFIRMADA &&
    !session?.noteId
  );
}

export function canViewSessionNote(session) {
  return Boolean(session?.noteId);
}

export function getSessionNoteLabel(session, isAssistant) {
  if (canViewSessionNote(session)) {
    return "Ver nota";
  }
  return canCreateSessionNote(session, isAssistant) ? "Crear nota" : "Sin nota";
}

export function isSessionNoteDisabled(session, isAssistant) {
  return !canViewSessionNote(session) && !canCreateSessionNote(session, isAssistant);
}

export default {
  getSessionPatientName,
  formatSessionModality,
  formatSessionLocation,
  canCreateSessionNote,
  canViewSessionNote,
  getSessionNoteLabel,
  isSessionNoteDisabled,
};
