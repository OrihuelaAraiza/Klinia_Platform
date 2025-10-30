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

export default {
  formatDateISOToHuman,
  formatPhone,
};
