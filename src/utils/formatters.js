export function formatDateISOToHuman(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatPhone(value) {
  if (!value) {
    return "";
  }
  const digits = String(value).replace(/\D/g, "");
  if (digits.length < 10) {
    return value;
  }
  const country = digits.length > 10 ? `+${digits.slice(0, digits.length - 10)} ` : "";
  const area = digits.slice(-10, -7);
  const middle = digits.slice(-7, -4);
  const last = digits.slice(-4);
  return `${country}(${area}) ${middle}-${last}`.trim();
}

function normalizeDateInput(value) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function resolveSexCode(patient) {
  const raw =
    patient?.gender ??
    patient?.sex ??
    patient?.sexo ??
    patient?.identity?.gender ??
    "";
  const normalized = String(raw).trim().toUpperCase();
  if (normalized.startsWith("M")) {
    return "1";
  }
  if (normalized.startsWith("F")) {
    return "2";
  }
  return "0";
}

function resolveMonthlySequence(patient) {
  const sequence =
    patient?.monthlySequence ??
    patient?.monthlyConsecutive ??
    patient?.sequenceMonthly ??
    patient?.consecutiveMonthly ??
    patient?.expedienteSequence ??
    patient?.recordSequence ??
    patient?.expedienteConsecutive ??
    patient?.recordConsecutive;
  if (sequence === null || sequence === undefined || sequence === "") {
    return null;
  }
  const numeric = Number(sequence);
  if (Number.isNaN(numeric)) {
    return null;
  }
  return numeric;
}

export function buildExpedienteNumber(patient) {
  if (!patient) {
    return "";
  }
  const existing =
    patient?.expedienteNumber ??
    patient?.recordNumber ??
    patient?.expediente ??
    patient?.record ??
    patient?.serial;
  if (existing) {
    return String(existing);
  }
  const dateValue =
    patient?.recordDate ??
    patient?.expedienteDate ??
    patient?.createdAt ??
    patient?.created_at ??
    patient?.registeredAt ??
    patient?.registrationDate;
  const date = normalizeDateInput(dateValue);
  if (!date) {
    return "";
  }
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const sexCode = resolveSexCode(patient);
  const sequence = resolveMonthlySequence(patient);
  const sequencePart = String(sequence ?? 0).padStart(3, "0");
  return `${yy}${mm}${dd}${sexCode}${sequencePart}`;
}

export default {
  formatDateISOToHuman,
  formatPhone,
  buildExpedienteNumber,
};
