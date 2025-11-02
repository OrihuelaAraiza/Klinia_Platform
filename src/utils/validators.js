const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const CURP_REGEX =
  /^[A-Z][AEIOU][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HM](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS)[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]\d$/;
const RFC_REGEX = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/i;
const GENERAL_PHONE_REGEX = /^[+]?[\d\s()-]{10,}$/;
const PHONE_MX_REGEX = /^\d{10}$/;
const POSTAL_CODE_REGEX = /^\d{5}$/;
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
  return GENERAL_PHONE_REGEX.test(String(phone).trim());
}

export function isValidMXPhone(phone) {
  return PHONE_MX_REGEX.test(String(phone).trim());
}

export function isValidPostalCode(postalCode) {
  return POSTAL_CODE_REGEX.test(String(postalCode).trim());
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

export function isValidRFC(value) {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }
  return RFC_REGEX.test(value.trim().toUpperCase());
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

export function isAdult(birthDate, minimumAge = 18) {
  if (!birthDate) {
    return false;
  }
  const date =
    birthDate instanceof Date ? birthDate : new Date(String(birthDate).trim());
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }

  return age >= minimumAge;
}

export default {
  isValidEmail,
  isValidPassword,
  isValidPhone,
  isValidMXPhone,
  isValidPostalCode,
  isValidDateYYYYMMDD,
  isValidCURP,
  isValidRFC,
  required,
  minLength,
  isAdult,
};
