import {
  setToken,
  setRefreshToken,
  getRefreshToken,
  setUser,
  setRole,
  clearAll,
  getUser,
  getRole,
  clearPartialToken,
} from "./storage";
import { api } from "./apiClient";

/**
 * Servicio de auth contra klinia-api (real, ya no mock).
 * Persiste tokens y user en localStorage para que el resto de la app los lea.
 */

function persistSession(response) {
  const accessToken = response.token || response.accessToken;
  const refreshToken = response.refreshToken;
  const user = response.user;
  if (accessToken) setToken(accessToken);
  if (refreshToken) setRefreshToken(refreshToken);
  if (user) {
    setUser(user);
    if (user.role) setRole(user.role);
  }
  return {
    token: accessToken,
    accessToken,
    refreshToken,
    user,
  };
}

export async function loginEmail({ email, password }) {
  if (!email || !password) {
    throw new Error("Ingresa correo y contraseña.");
  }
  const response = await api.post("/auth/login", { email, password }, { auth: false });
  return persistSession(response);
}

export async function loginMicrosoft(idToken) {
  if (!idToken) {
    throw new Error("Token de Microsoft inválido.");
  }
  const response = await api.post("/auth/microsoft", { idToken }, { auth: false });
  if (response.status === "REGISTRATION_REQUIRED") {
    return response; // El caller maneja el partialToken
  }
  clearPartialToken();
  return persistSession(response);
}

export async function registerComplete(payload) {
  const response = await api.post("/auth/register/complete", payload, { auth: false });
  return persistSession(response);
}

export async function registerCompleteMsal(payload, partialToken) {
  const response = await api.post(
    "/auth/register-msal",
    { ...payload, partialToken },
    { auth: false }
  );
  return persistSession(response);
}

export async function register({ name, email, password, role, acceptPolicies }) {
  if (!name?.trim() || !email?.trim() || !password || !role) {
    throw new Error("Completa todos los campos requeridos.");
  }
  if (!acceptPolicies) {
    throw new Error("Debes aceptar el Aviso de Privacidad y Términos.");
  }
  const response = await api.post(
    "/auth/register",
    { name: name.trim(), email: email.trim().toLowerCase(), password, role, acceptPolicies },
    { auth: false }
  );
  return persistSession(response);
}

export async function logout() {
  try {
    await api.post("/auth/logout", {});
  } catch {
    // Si el server cayó, igualmente limpiamos el storage local
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

/**
 * Re-hidrata la sesión: pide al backend el user actual y refresca cache.
 * Si el token expiró, apiClient hace refresh automático. Si todo falla,
 * limpia la sesión.
 */
export async function hydrateSession() {
  const cached = getUser();
  if (!cached?.id) return null;

  const refreshToken = getRefreshToken();
  // Sin refresh token no podemos revalidar — la sesión está rota, hay que cerrarla.
  if (!refreshToken) {
    clearAll();
    return null;
  }

  try {
    const refreshed = await api.post("/auth/refresh", { refreshToken }, { auth: false });
    if (refreshed?.user) {
      setUser(refreshed.user);
      if (refreshed.user.role) setRole(refreshed.user.role);
      if (refreshed.token || refreshed.accessToken) setToken(refreshed.token || refreshed.accessToken);
      if (refreshed.refreshToken) setRefreshToken(refreshed.refreshToken);
      return refreshed.user;
    }
    // Backend respondió pero sin user → tratar como sesión inválida
    clearAll();
    return null;
  } catch (err) {
    // 401/403 (refresh token rechazado): cerrar sesión.
    // Otros errores (red, 5xx): preservar storage para reintento.
    if (err?.status === 401 || err?.status === 403) {
      clearAll();
      return null;
    }
    return cached;
  }
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
  hydrateSession,
};
