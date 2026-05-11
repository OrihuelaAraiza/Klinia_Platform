import {
  setToken,
  setRefreshToken,
  setUser,
  setRole,
  clearAll,
  getUser,
  getRole,
  clearPartialToken,
} from "./storage";
import { db, persist, uid, delay } from "./mocks/db";

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
  const data = db();
  data.currentUserId = user.id;
  persist();
  return {
    token: access,
    accessToken: access,
    refreshToken: refresh,
    user: publicUser,
  };
}

export async function loginEmail({ email, password }) {
  if (!email || !password) {
    throw new Error("Ingresa correo y contraseña.");
  }
  await delay();
  const data = db();
  const normalized = email.trim().toLowerCase();
  const user = data.users.find(
    (u) => u.email.toLowerCase() === normalized && u.password === password
  );
  if (!user) {
    const err = new Error("Credenciales incorrectas. Usa doctor@demo.com / demo1234 o paciente@demo.com / demo1234");
    err.status = 401;
    throw err;
  }
  return persistSession(user);
}

export async function loginMicrosoft(idToken) {
  if (!idToken) {
    throw new Error("Token de Microsoft inválido.");
  }
  await delay();
  const data = db();
  const user = data.users.find((u) => u.role === "PROFESSIONAL");
  clearPartialToken();
  const session = persistSession(user);
  return { status: "LOGIN_SUCCESS", ...session };
}

export async function registerComplete(payload) {
  await delay();
  const data = db();
  const role = payload?.role || "PROFESSIONAL";
  const newUser = {
    id: uid("user"),
    email: (payload?.email || `nuevo+${Date.now()}@demo.com`).toLowerCase(),
    password: payload?.password || "demo1234",
    firstName: payload?.firstName || payload?.name || "Usuario",
    lastName: payload?.lastName || "Demo",
    name: payload?.name || `${payload?.firstName || ""} ${payload?.lastName || ""}`.trim(),
    role,
    phone: payload?.phone || "",
    verified: true,
    ...payload,
  };
  delete newUser.acceptPolicies;
  data.users.push(newUser);
  persist();
  return persistSession(newUser);
}

export async function registerCompleteMsal(payload /*, partialToken */) {
  return registerComplete(payload);
}

export async function register({ name, email, password, role, acceptPolicies }) {
  if (!name?.trim() || !email?.trim() || !password || !role) {
    throw new Error("Completa todos los campos requeridos.");
  }
  if (!acceptPolicies) {
    throw new Error("Debes aceptar el Aviso de Privacidad y Términos.");
  }
  await delay();
  const data = db();
  const normalized = email.trim().toLowerCase();
  if (data.users.find((u) => u.email.toLowerCase() === normalized)) {
    const err = new Error("Ya existe una cuenta con ese correo.");
    err.status = 409;
    throw err;
  }
  return registerComplete({
    name: name.trim(),
    firstName: name.trim().split(" ")[0],
    lastName: name.trim().split(" ").slice(1).join(" ") || "Demo",
    email: normalized,
    password,
    role,
  });
}

export async function logout() {
  try {
    const data = db();
    data.currentUserId = null;
    persist();
  } catch {
    /* noop */
  } finally {
    clearAll();
  }
}

export function currentUser() {
  return getUser();
}

export function currentRole() {
  return getRole();
}

export function clearSession() {
  clearAll();
}

export default {
  loginEmail,
  loginMicrosoft,
  register,
  registerComplete,
  registerCompleteMsal,
  logout,
  currentUser,
  currentRole,
  clearSession,
};
