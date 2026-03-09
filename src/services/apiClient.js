import { getToken, clearAll } from "./storage";
import { ROUTES } from "../utils/constants";

const RAW_BASE = import.meta.env.VITE_API_BASE_URL;

function normalizeBaseUrl(url) {
  if (!url) return "/api";
  let normalized = url.replace(/\/+$/, "");
  if (normalized.startsWith("/")) return normalized;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  if (normalized.includes(".") && !normalized.includes("://")) {
    return `https://${normalized}`;
  }
  return normalized;
}

const BASE_URL = normalizeBaseUrl(RAW_BASE);

function buildUrl(path = "") {
  if (/^https?:\/\//i.test(path)) return path;
  let normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (BASE_URL.startsWith("/")) {
    return normalizedPath.startsWith("/api") ? normalizedPath : `${BASE_URL}${normalizedPath}`;
  } else {
    let base = BASE_URL;
    const baseEndsWithApi = base.endsWith("/api") || base.endsWith("/api/");
    if (!baseEndsWithApi) {
      base = base.endsWith("/") ? `${base}api` : `${base}/api`;
    }
    return `${base}${normalizedPath}`;
  }
}

async function request(path, options = {}) {
  const {
    method = "GET",
    headers = {},
    body,
    auth = true,
    signal,
    skipAuthError = false,
  } = options;

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const isBinary = (typeof Blob !== "undefined" && body instanceof Blob) || 
                   (body instanceof ArrayBuffer) || 
                   (typeof File !== "undefined" && body instanceof File);

  const defaultHeaders = {};
  if (body !== undefined && !isFormData && !isBinary && typeof body !== "string") {
    defaultHeaders["Content-Type"] = "application/json";
  }

  const requestHeaders = {
    ...defaultHeaders,
    ...headers,
  };

  if (auth) {
    const token = getToken();
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }
  }

  let payload = body;
  if (payload !== undefined && !isFormData && !isBinary && typeof payload !== "string" && !(payload instanceof URLSearchParams)) {
    payload = JSON.stringify(payload);
  }

  try {
    const response = await fetch(buildUrl(path), {
      method,
      headers: requestHeaders,
      body: payload,
      signal,
      credentials: "include",
    });

    // 1. Manejo de errores de Autenticación
    if (response.status === 401) {
      if (!skipAuthError) {
        clearAll();
        if (typeof window !== "undefined" && window.location.pathname !== ROUTES.login) {
          window.location.replace(ROUTES.login);
        }
      }
      const error = new Error("Sesión expirada.");
      error.status = 401;
      throw error;
    }

    // 2. Leer la respuesta una sola vez para evitar agotar el stream
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      data = { message: text };
    }

    // 3. Manejo de errores (400, 403, 409, 500, etc.)
    if (!response.ok) {
      let errorMessage = data?.message || "Error en la petición";
      
      if (data?.details && Array.isArray(data.details)) {
        // Diccionario de traducción de campos
        const fieldLabels = {
          email: "Correo electrónico",
          password: "Contraseña",
          firstName: "Nombre",
          lastName: "Apellidos",
          curp: "CURP",
          birthDate: "Fecha de nacimiento",
          phone: "Teléfono",
          officeName: "Nombre del consultorio",
          street: "Calle y número",
          neighborhood: "Colonia",
          city: "Ciudad/Municipio",
          state: "Estado",
          postalCode: "Código Postal",
          emergencyName: "Contacto de emergencia",
          emergencyPhone: "Teléfono de emergencia",
          specialty: "Especialidad",
          certificateFolio: "Folio de cédula",
          referral: "Referencia",
          purpose: "Motivo de consulta",
          legalGuardianName: "Nombre del tutor",
          legalGuardianPhone: "Teléfono del tutor"
        };

        // Traductor de reglas de validación (Zod)
        const translateZod = (msg) => {
          const lower = msg.toLowerCase();
          if (lower.includes("at least")) {
            const num = msg.match(/\d+/);
            return `debe tener al menos ${num} caracteres`;
          }
          if (lower.includes("required") || lower.includes("invalid_type")) {
            return "es obligatorio";
          }
          if (lower.includes("invalid email")) {
            return "debe ser un correo válido";
          }
          if (lower.includes("invalid")) {
            return "tiene un formato inválido";
          }
          return msg;
        };

        const detailsSummary = data.details
          .map(d => {
            const rawField = Array.isArray(d.path) ? d.path[d.path.length - 1] : "campo";
            const label = fieldLabels[rawField] || rawField;
            return `${label} ${translateZod(d.message)}`;
          })
          .join(", ");
          
        errorMessage = `Revisa los campos: ${detailsSummary}`;
      }

      const error = new Error(errorMessage);
      error.status = response.status;
      error.details = data?.details; // Pasamos el array original por si se necesita
      throw error;
    }

    return data;

  } catch (networkError) {
    if (networkError.status) throw networkError;
    const error = new Error("Error de conexión con el servidor.");
    error.code = "NETWORK_ERROR";
    throw error;
  }
}

const withMethod = (method) => (path, payload, options = {}) => 
  request(path, { ...options, method, body: payload });

export const api = {
  get: (path, options) => request(path, { ...options, method: "GET" }),
  post: withMethod("POST"),
  put: withMethod("PUT"),
  patch: withMethod("PATCH"),
  del: (path, options) => request(path, { ...options, method: "DELETE" }),
  request,
};

export default api;