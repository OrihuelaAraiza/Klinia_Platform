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

    if (response.status === 401) {
      if (!skipAuthError) {
        const token = getToken();
        if (token) {
          if (!import.meta.env.DEV) {
            clearAll();
            if (typeof window !== "undefined" && window.location.pathname !== ROUTES.login) {
              window.location.replace(ROUTES.login);
            }
          }
        }
      }
      const error = new Error("Sesión expirada o no autorizado.");
      error.status = 401;
      throw error;
    }

    if (response.status === 403) {
      const error = new Error("No tienes permisos para realizar esta acción.");
      error.status = 403;
      throw error;
    }

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      data = text;
    }

    if (!response.ok) {
      const error = new Error(data?.message || `Error ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;

  } catch (networkError) {
    if (networkError.status) throw networkError;
    const error = new Error("Error de conexión con el servidor (HTTPS/CORS).");
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