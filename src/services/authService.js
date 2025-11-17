import { api } from "./apiClient";
import {
  setToken,
  setUser,
  setRole,
  clearAll,
  getUser,
  getRole,
  setPartialToken, 
  clearPartialToken, 
} from "./storage";

const LOGIN_EMAIL_ENDPOINT = "/auth/login";
const LOGIN_MICROSOFT_ENDPOINT = "/auth/microsoft";
const LOGOUT_ENDPOINT = "/auth/logout";
const REGISTER_ENDPOINT = "/auth/register"; 
const REGISTER_COMPLETE_ENDPOINT = "/auth/register/complete";
const REGISTER_MSAL_ENDPOINT = "/auth/register-msal";

function persistSession(session) {
  const { token, user } = session ?? {};
  if (!token || !user) {
    throw new Error("Respuesta de autenticación inválida");
  }
  setToken(token);
  setUser(user);
  setRole(user.role);
  return { token, user };
}

export async function loginEmail({ email, password }) {
  if (!email || !password) {
    throw new Error("Ingresa correo y contraseña.");
  }

  const response = await api.post(
    LOGIN_EMAIL_ENDPOINT,
    { email, password },
    { auth: false }
  );

  return persistSession(response);
}

export async function loginMicrosoft(idToken) {
  if (!idToken) {
    throw new Error("Token de Microsoft inválido.");
  }

  const response = await api.post(
    LOGIN_MICROSOFT_ENDPOINT,
    { idToken },
    { auth: false }
  );

  if (response.status === 'LOGIN_SUCCESS') {
    clearPartialToken(); 
    return persistSession(response); 
  } 
  
  if (response.status === 'REGISTRATION_REQUIRED') {
    setPartialToken(response.partialToken); 
    return { partialToken: response.partialToken }; 
  }

  throw new Error("Respuesta de autenticación desconocida.");
}


export async function registerComplete(payload) {
  const response = await api.post(
    REGISTER_COMPLETE_ENDPOINT,
    payload,
    { auth: false }
  );

  return response; 
}

export async function registerCompleteMsal(payload, partialToken) {
  const response = await api.post(
    REGISTER_MSAL_ENDPOINT,
    { 
      payload: payload, 
      partialToken: partialToken 
    },
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
    REGISTER_ENDPOINT,
    {
      name: name.trim(),
      email: email.trim(),
      password,
      role,
      acceptPolicies: Boolean(acceptPolicies),
    },
    { auth: false }
  );

  return response;
}

export async function logout() {
  try {
    await api.post(LOGOUT_ENDPOINT, {}, { auth: true });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.debug("[auth] logout skip", error.message);
    }
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
