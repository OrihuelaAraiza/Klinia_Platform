import { getToken, clearAll } from "./storage";
import { ROUTES } from "../utils/constants";

const RAW_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

function normalizeBaseUrl(url) {
  if (!url) {
    return "/api";
  }
  
  // Remove trailing slashes
  url = url.replace(/\/+$/, "");
  
  // If it's a relative path, return as is
  if (url.startsWith("/")) {
    return url || "/api";
  }
  
  // If it's already a full URL, return it (may or may not include /api)
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  
  // If it's a domain without protocol, add https
  if (url.includes(".") && !url.includes("://")) {
    return `https://${url}`;
  }
  
  return url;
}

const NORMALIZED_BASE = normalizeBaseUrl(RAW_BASE);
const BASE_URL = NORMALIZED_BASE;

if (import.meta.env.DEV) {
  console.log("[API Client] RAW_BASE:", RAW_BASE);
  console.log("[API Client] NORMALIZED_BASE:", NORMALIZED_BASE);
  console.log("[API Client] BASE_URL:", BASE_URL);
}

function buildUrl(path = "") {
  // If path is already a full URL, return it
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  // Normalize path: ensure it starts with /
  let normalizedPath = path.startsWith("/") ? path : `/${path}`;
  
  let finalUrl;
  
  if (BASE_URL.startsWith("/")) {
    // Relative path (local development with Vite proxy)
    // BASE_URL should be /api, path should be /api/... or just /...
    if (normalizedPath.startsWith("/api")) {
      finalUrl = normalizedPath;
    } else {
      finalUrl = `${BASE_URL}${normalizedPath}`;
    }
  } else {
    // Absolute URL (production/Azure)
    // BASE_URL might be https://.../api or https://...
    let base = BASE_URL;
    const baseEndsWithApi = base.endsWith("/api") || base.endsWith("/api/");
    

    
    if (!baseEndsWithApi) {
      base = base.endsWith("/") ? `${base}api` : `${base}/api`;
    }
    
    finalUrl = `${base}${normalizedPath}`;
  }

  // Debug: Log en desarrollo
  if (import.meta.env.DEV) {
    console.log("[API Client] buildUrl:", { path, normalizedPath, BASE_URL, finalUrl });
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
    skipAuthError = false, // If true, don't clear session on 401
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

if (response.status === 401) {
    // Only clear session and redirect if this is a critical auth error
    // Non-critical requests (like audit logs, dashboard stats) can fail without clearing session
    if (!skipAuthError) {
      const token = getToken();
      // Only clear if we actually have a token (otherwise it's a login attempt failing)
      if (token) {
        // In development, log for debugging but don't clear session on first 401
        // This prevents clearing session when backend endpoints don't exist
        if (import.meta.env.DEV) {
          console.warn("[API Client] 401 error but keeping session (dev mode). Path:", path);
          // In dev, only clear session if we're sure the token is invalid
          // For now, we'll be more lenient and not clear immediately
        } else {
          // In production, clear session on 401
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
  } catch (parseError) {
    data = text;
  }

  if (!response.ok) {
   if (import.meta.env.DEV) {
      console.error("[API Client] Error detallado del servidor:", {
        status: response.status,
        path,
        data: data 
      });
    }

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
  patch: withMethod("PATCH"),
  del: (path, options) => request(path, { ...options, method: "DELETE" }),
  request,
};

export default api;
