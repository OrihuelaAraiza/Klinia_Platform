import { db, persist, uid, delay, nowIso } from "./mocks/db";
import {
  getUser,
  setToken,
  setRefreshToken,
  setUser,
  setRole,
} from "./storage";

function makeToken(userId) {
  return `mock.${userId}.${Date.now().toString(36)}`;
}

function persistSession(user) {
  const access = makeToken(user.id);
  const refresh = `refresh.${user.id}`;
  setToken(access);
  setRefreshToken(refresh);
  const publicUser = { ...user };
  delete publicUser.password;
  setUser(publicUser);
  setRole(publicUser.role);
  return { token: access, accessToken: access, refreshToken: refresh, user: publicUser };
}

async function handle(method, path, body) {
  await delay(80);
  const store = db();

  // Auth endpoints
  if (path === "/auth/forgot-password" && method === "POST") {
    return { ok: true, sent: true, debugMessage: "Correo de recuperación enviado (mock)." };
  }
  if (path === "/auth/reset-password" && method === "POST") {
    return { ok: true, reset: true };
  }
  if (path === "/auth/register/patient" && method === "POST") {
    const email = (body?.email || `paciente+${Date.now()}@demo.com`).toLowerCase();
    if (store.users.find((u) => u.email.toLowerCase() === email)) {
      const err = new Error("Ya existe una cuenta con ese correo.");
      err.status = 409;
      throw err;
    }
    const user = {
      id: uid("user"),
      email,
      password: body?.password || "demo1234",
      firstName: body?.firstName || "Paciente",
      lastName: body?.lastName || "Nuevo",
      name: `${body?.firstName || "Paciente"} ${body?.lastName || "Nuevo"}`.trim(),
      role: "PATIENT",
      phone: body?.phone || "",
      verified: true,
    };
    store.users.push(user);
    const patient = {
      id: uid("pat"),
      userId: user.id,
      professionalId: body?.professionalId || "prof_demo_1",
      firstName: user.firstName,
      lastName: user.lastName,
      curp: body?.curp || "",
      email,
      phone: user.phone,
      birthDate: body?.birthDate || "",
      status: "ACTIVE",
      createdAt: nowIso(),
      updatedAt: nowIso(),
      attachments: [],
      ...body,
    };
    store.patients.push(patient);
    user.patientId = patient.id;
    persist();
    return persistSession(user);
  }
  if (path === "/auth/refresh" && method === "POST") {
    const user = getUser();
    if (!user) return null;
    return persistSession(user);
  }
  if (path === "/auth/logout" && method === "POST") {
    return { ok: true };
  }

  // Patient profile shortcuts
  if (path === "/patient/profile" && method === "PUT") {
    const user = getUser();
    const patient = store.patients.find(
      (p) => p.userId === user?.id || p.id === user?.patientId
    );
    if (patient) {
      Object.assign(patient, body, { updatedAt: nowIso() });
      persist();
      return patient;
    }
    return body;
  }
  if (path === "/patient/profile" && method === "GET") {
    const user = getUser();
    return (
      store.patients.find((p) => p.userId === user?.id || p.id === user?.patientId) ||
      null
    );
  }

  // Postal code lookup
  if (path.startsWith("/utils/consulta-cp/")) {
    const cp = path.split("/").pop();
    return {
      cp,
      municipio: "Ciudad de México",
      estado: "CDMX",
      colonias: ["Centro", "Roma Norte", "Condesa", "Polanco"],
    };
  }

  // Default: empty
  if (import.meta.env?.DEV) {
    console.warn(`[mock apiClient] ${method} ${path} not handled, returning null`);
  }
  return null;
}

async function request(path, options = {}) {
  const { method = "GET", body } = options;
  try {
    return await handle(method, path, body);
  } catch (err) {
    if (!err.status) {
      err.code = err.code || "NETWORK_ERROR";
    }
    throw err;
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
