import { getToken, clearAll } from "./storage";
import { ROUTES } from "../utils/constants";

const RAW_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

// Normalizar BASE_URL: si parece ser un dominio (contiene puntos y no empieza con /)
// pero no tiene protocolo, agregar https:// automáticamente
function normalizeBaseUrl(url) {
  if (!url || url.startsWith("/")) {
    return url;
  }
  
  // Si ya tiene protocolo, retornar tal cual
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  
  // Si parece ser un dominio (contiene al menos un punto y no es una ruta)
  // y no tiene protocolo, agregar https://
  if (url.includes(".") && !url.includes("://")) {
    return `https://${url}`;
  }
  
  return url;
}

const NORMALIZED_BASE = normalizeBaseUrl(RAW_BASE);
const BASE_URL = NORMALIZED_BASE.endsWith("/") ? NORMALIZED_BASE.slice(0, -1) : NORMALIZED_BASE;

// Debug: Log en desarrollo para verificar la configuración
if (import.meta.env.DEV) {
  console.log("[API Client] RAW_BASE:", RAW_BASE);
  console.log("[API Client] NORMALIZED_BASE:", NORMALIZED_BASE);
  console.log("[API Client] BASE_URL:", BASE_URL);
}

function buildUrl(path = "") {
  // Si el path ya es una URL completa, retornarla tal cual
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  // Construir la URL base + path
  let finalUrl;
  if (!path.startsWith("/")) {
    finalUrl = `${BASE_URL}/${path}`;
  } else {
    finalUrl = `${BASE_URL}${path}`;
  }

  // Validación final: si la URL resultante parece ser absoluta (tiene punto y no tiene protocolo)
  // pero BASE_URL no empezaba con /, entonces agregar https://
  if (!finalUrl.startsWith("/") && !/^https?:\/\//i.test(finalUrl) && finalUrl.includes(".")) {
    finalUrl = `https://${finalUrl}`;
  }

  // Debug: Log en desarrollo
  if (import.meta.env.DEV) {
    console.log("[API Client] buildUrl:", { path, finalUrl });
  }

  return finalUrl;
}

async function request(path, options = {}) {
  const {
    method = "GET",
    headers = {},
    body,
    auth = true,
    signal,
  } = options;

  const hasFormData = typeof FormData !== "undefined";
  const hasBlob = typeof Blob !== "undefined";
  const hasFile = typeof File !== "undefined";
  const isFormData = hasFormData && body instanceof FormData;
  const isBlob = hasBlob && body instanceof Blob;
  const isFile = hasFile && body instanceof File;
  const isArrayBuffer = body instanceof ArrayBuffer;
  const isBodyBinary = isBlob || isArrayBuffer || isFile;

  const defaultHeaders = {};
  if (
    body !== undefined &&
    !isFormData &&
    !isBodyBinary &&
    typeof body !== "string"
  ) {
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

  let response;
  let payload = body;

  if (payload !== undefined) {
    if (
      !isFormData &&
      !isBodyBinary &&
      typeof payload !== "string" &&
      !(payload instanceof URLSearchParams)
    ) {
      payload = JSON.stringify(payload);
    }
  }

  try {
    response = await fetch(buildUrl(path), {
      method,
      headers: requestHeaders,
      body: payload,
      signal,
      credentials: "include",
    });
  } catch (networkError) {
    const error = new Error(
      "No se puede conectar con el servidor. Verifica tu red o la URL del API."
    );
    error.code = "NETWORK_ERROR";
    error.cause = networkError;
    throw error;
  }

  if (response.status === 401 || response.status === 403) {
    clearAll();
    if (typeof window !== "undefined" && window.location.pathname !== ROUTES.login) {
      window.location.replace(ROUTES.login);
    }
    throw new Error("Sesión expirada o sin permisos.");
  }

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (parseError) {
    data = text;
  }

  if (!response.ok) {
    const error = new Error(data?.message || `Error ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function withMethod(method) {
  return (path, payload, options = {}) =>
    request(path, { ...options, method, body: payload });
}

export const api = {
  get: (path, options) => request(path, { ...options, method: "GET" }),
  post: withMethod("POST"),
  put: withMethod("PUT"),
  del: (path, options) => request(path, { ...options, method: "DELETE" }),
  request,
};

export default api;
