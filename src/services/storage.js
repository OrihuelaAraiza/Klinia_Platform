const TOKEN_KEY = "klinia.token";
const ROLE_KEY = "klinia.role";
const USER_KEY = "klinia.user";

const isBrowser = () => typeof window !== "undefined";

function safeGet(key) {
  if (!isBrowser()) {
    return null;
  }
  return window.localStorage.getItem(key);
}

function safeSet(key, value) {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.setItem(key, value);
}

function safeRemove(key) {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.removeItem(key);
}

export function setToken(token) {
  safeSet(TOKEN_KEY, token);
}

export function getToken() {
  return safeGet(TOKEN_KEY);
}

export function clearToken() {
  safeRemove(TOKEN_KEY);
}

export function setRole(role) {
  safeSet(ROLE_KEY, role);
}

export function getRole() {
  return safeGet(ROLE_KEY);
}

export function clearRole() {
  safeRemove(ROLE_KEY);
}

export function setUser(user) {
  if (!user) {
    safeRemove(USER_KEY);
    return;
  }
  safeSet(USER_KEY, JSON.stringify(user));
}

export function getUser() {
  const raw = safeGet(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn("[storage] Unable to parse stored user", error);
    safeRemove(USER_KEY);
    return null;
  }
}

export function clearUser() {
  safeRemove(USER_KEY);
}

export function clearAll() {
  clearToken();
  clearRole();
  clearUser();
}

export default {
  setToken,
  getToken,
  clearToken,
  setRole,
  getRole,
  clearRole,
  setUser,
  getUser,
  clearUser,
  clearAll,
};
