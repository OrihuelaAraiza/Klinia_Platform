/**
 * Persistencia de selección pre-registro: el visitante elige un terapeuta
 * (y opcionalmente uno de respaldo) desde la landing antes de tener cuenta.
 * La selección sobrevive a la navegación Login ↔ Register vía sessionStorage.
 *
 * Modelo guardado:
 *  {
 *    primary: { id, name, specialty, specialtyName } | null,
 *    backup:  { id, name, specialty, specialtyName } | null,
 *    updatedAt: ISO string,
 *  }
 */

const KEY = "romimente.therapistSelection";

const isBrowser = () => typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";

function read() {
  if (!isBrowser()) return { primary: null, backup: null };
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return { primary: null, backup: null };
    const parsed = JSON.parse(raw);
    return {
      primary: parsed.primary || null,
      backup: parsed.backup || null,
      updatedAt: parsed.updatedAt || null,
    };
  } catch {
    return { primary: null, backup: null };
  }
}

function write(state) {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(
      KEY,
      JSON.stringify({ ...state, updatedAt: new Date().toISOString() })
    );
    // Avisar a otros componentes en la misma pestaña que la selección cambió.
    window.dispatchEvent(new CustomEvent("therapist-selection-change"));
  } catch {
    /* noop */
  }
}

function toSummary(therapist) {
  if (!therapist) return null;
  return {
    id: therapist.id,
    name: therapist.name || `${therapist.firstName || ""} ${therapist.lastName || ""}`.trim(),
    specialty: therapist.specialty || "",
    specialtyName: therapist.specialtyName || "",
  };
}

export function getSelection() {
  return read();
}

export function setPrimary(therapist) {
  const state = read();
  const summary = toSummary(therapist);
  // Si la nueva primary coincide con la backup, limpia la backup para evitar
  // duplicados.
  if (state.backup && summary && state.backup.id === summary.id) {
    state.backup = null;
  }
  state.primary = summary;
  write(state);
  return state;
}

export function setBackup(therapist) {
  const state = read();
  const summary = toSummary(therapist);
  if (state.primary && summary && state.primary.id === summary.id) {
    // No tiene sentido elegir la misma como backup.
    return state;
  }
  state.backup = summary;
  write(state);
  return state;
}

export function clearPrimary() {
  const state = read();
  state.primary = null;
  write(state);
  return state;
}

export function clearBackup() {
  const state = read();
  state.backup = null;
  write(state);
  return state;
}

export function clearAll() {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent("therapist-selection-change"));
  } catch {
    /* noop */
  }
}

export default {
  getSelection,
  setPrimary,
  setBackup,
  clearPrimary,
  clearBackup,
  clearAll,
};
