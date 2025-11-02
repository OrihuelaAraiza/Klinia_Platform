import { getToken, clearAll } from "./storage";
import { ROUTES } from "../utils/constants";

const RAW_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const BASE_URL = RAW_BASE.endsWith("/") ? RAW_BASE.slice(0, -1) : RAW_BASE;

function buildUrl(path = "") {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (!path.startsWith("/")) {
    return `${BASE_URL}/${path}`;
  }

  return `${BASE_URL}${path}`;
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
