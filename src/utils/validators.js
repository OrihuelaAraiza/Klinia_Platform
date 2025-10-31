const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const CURP_REGEX =
  /^[A-Z][AEIOUX][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HM](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TL|TS|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]\d$/;
const PHONE_REGEX = /^[+]?[\d\s()-]{10,}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isValidEmail(email) {
  return EMAIL_REGEX.test(String(email).toLowerCase());
}

export function isValidPassword(password) {
  if (typeof password !== "string") {
    return false;
  }
  return PASSWORD_REGEX.test(password);
}

export function isValidPhone(phone) {
  return PHONE_REGEX.test(String(phone).trim());
}

export function isValidDateYYYYMMDD(value) {
  if (!DATE_REGEX.test(value)) {
    return false;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

export function isValidCURP(value) {
  if (typeof value !== "string") {
    return false;
  }
  return CURP_REGEX.test(value.toUpperCase());
}

export function required(value) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return value !== undefined && value !== null && String(value).trim().length > 0;
}

export function minLength(value, length) {
  if (value === undefined || value === null) {
    return false;
  }
  return String(value).trim().length >= length;
}

export default {
  isValidEmail,
  isValidPassword,
  isValidPhone,
  isValidDateYYYYMMDD,
  isValidCURP,
  required,
  minLength,
};
