import { api } from "./apiClient";
import {
  setToken,
  setUser,
  setRole,
  clearAll,
  getUser,
  getRole,
} from "./storage";

const LOGIN_ENDPOINT = "/auth/login";
const LOGOUT_ENDPOINT = "/auth/logout";
const REGISTER_ENDPOINT = "/auth/register";

export async function login(email, password) {
  if (!email || !password) {
    throw new Error("Ingresa correo y contraseña");
  }

  const response = await api.post(
    LOGIN_ENDPOINT,
    { email, password },
    { auth: false }
  );

  if (!response?.token || !response?.user) {
    throw new Error("Respuesta de autenticación inválida");
  }

  setToken(response.token);
  setUser(response.user);
  setRole(response.user.role);

  return response;
}

export async function logout() {
  try {
    await api.post(LOGOUT_ENDPOINT, {}, { auth: true });
  } catch (error) {
    console.debug("[auth] logout call skipped", error.message);
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

export async function register({ name, email, password, role }) {
  if (!name || !email || !password || !role) {
    throw new Error("Completa todos los campos requeridos");
  }

  const response = await api.post(
    REGISTER_ENDPOINT,
    {
      name,
      email,
      password,
      role,
    },
    { auth: false }
  );

  if (!response?.token || !response?.user) {
    throw new Error("Respuesta de registro inválida");
  }

  setToken(response.token);
  setUser(response.user);
  setRole(response.user.role);

  return response.user;
}

export default {
  login,
  logout,
  register,
  currentUser,
  currentRole,
};
