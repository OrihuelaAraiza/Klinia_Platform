import {
  getToken,
  setToken,
  setRefreshToken,
  getRefreshToken,
  clearAll,
} from "./storage";

/**
 * Cliente HTTP para hablar con klinia-api.
 *
 * Configuración:
 *   - Lee la URL base de `import.meta.env.VITE_API_URL`.
 *   - Default: `http://localhost:4000/api` (modo dev local).
 *
 * Features:
 *   - Inyecta `Authorization: Bearer <token>` desde localStorage.
 *   - Soporta FormData sin pisar el content-type del navegador.
 *   - Refresh automático ante 401 (intenta /auth/refresh y reintenta UNA vez).
 *   - Si el refresh falla → clearAll() y redirige al login.
 *   - Lanza Error con `.status` y `.message` para que los callers traten errores
 *     con el mismo patrón que tenían antes.
 *
 * Uso:
 *   import api from "./apiClient";
 *   await api.get("/patients");
 *   await api.post("/auth/login", { email, password });
 *   await api.get("/utils/consulta-cp/06700", { auth: false });
 */

const BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "http://localhost:4000/api";

let isRefreshing = false;
let refreshQueue = [];

function notifyRefreshed(error, newToken) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(newToken);
  });
  refreshQueue = [];
}

async function refreshAccessToken() {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      refreshQueue.push({ resolve, reject });
    });
  }
  isRefreshing = true;
  try {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw makeError("Sin refresh token disponible.", 401);
    }
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw makeError(data.message || "Sesión expirada.", response.status);
    }
    const data = await response.json();
    const newToken = data.token || data.accessToken;
    if (newToken) setToken(newToken);
    if (data.refreshToken) setRefreshToken(data.refreshToken);
    notifyRefreshed(null, newToken);
    return newToken;
  } catch (error) {
    notifyRefreshed(error, null);
    clearAll();
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
    throw error;
  } finally {
    isRefreshing = false;
  }
}

function makeError(message, status, details) {
  const err = new Error(message);
  err.status = status;
  if (details) err.details = details;
  return err;
}

function buildHeaders(body, extra, auth) {
  const headers = { Accept: "application/json", ...(extra || {}) };
  // No tocamos Content-Type si el body es FormData (browser lo setea con boundary)
  if (body && !(body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (auth !== false) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function serializeBody(body) {
  if (body === undefined || body === null) return undefined;
  if (body instanceof FormData) return body;
  if (typeof body === "string") return body;
  return JSON.stringify(body);
}

async function request(method, path, body, options = {}) {
  const { auth = true, headers: extraHeaders, signal } = options;
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;

  const doFetch = async () =>
    fetch(url, {
      method,
      headers: buildHeaders(body, extraHeaders, auth),
      body: serializeBody(body),
      signal,
      credentials: "omit",
    });

  let response = await doFetch();

  // Si recibimos 401 en una llamada autenticada, intentamos refresh una sola vez.
  if (response.status === 401 && auth !== false && !options._retry) {
    try {
      await refreshAccessToken();
      return request(method, path, body, { ...options, _retry: true });
    } catch {
      // refreshAccessToken ya limpió y redirigió; relanzamos el 401 original
    }
  }

  // No content
  if (response.status === 204) return null;

  let data;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await response.json().catch(() => null);
  } else {
    data = await response.text().catch(() => null);
  }

  if (!response.ok) {
    const message =
      (data && (data.message || data.error)) ||
      response.statusText ||
      "Error en la solicitud.";
    throw makeError(message, response.status, data?.errors || data?.details);
  }

  return data;
}

export const api = {
  get: (path, options) => request("GET", path, undefined, options),
  post: (path, body, options) => request("POST", path, body, options),
  put: (path, body, options) => request("PUT", path, body, options),
  patch: (path, body, options) => request("PATCH", path, body, options),
  delete: (path, options) => request("DELETE", path, undefined, options),
  request,
};

export default api;
