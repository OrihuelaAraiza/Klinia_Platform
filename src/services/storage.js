const TOKEN_KEY = "brevemente.token";
const ROLE_KEY = "brevemente.role";
const USER_KEY = "brevemente.user";
const PARTIAL_TOKEN_KEY = "brevemente.partial_token";


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


export function getItem(key) {
  return safeGet(key);
}
export function setItem(key, value) {
  safeSet(key, value);
}

export function removeItem(key) {
  safeRemove(key);
}

export function getObject(key, fallback = null) {
  const raw = safeGet(key);
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn("[storage] Unable to parse stored value for", key, error);
    safeRemove(key);
    return fallback;
  }
}

export function setObject(key, value) {
  if (value === undefined || value === null) {
    safeRemove(key);
    return;
  }
  try {
    safeSet(key, JSON.stringify(value));
  } catch (error) {
    console.warn("[storage] Unable to persist value for", key, error);
  }
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


export function setPartialToken(token) {
  safeSet(PARTIAL_TOKEN_KEY, token);
}

export function getPartialToken() {
  return safeGet(PARTIAL_TOKEN_KEY);
}

export function clearPartialToken() {
  safeRemove(PARTIAL_TOKEN_KEY);
}

export function clearAll() {
  clearToken();
  clearRole();
  clearUser();
  clearPartialToken(); 
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
  getItem,
  setItem,
  removeItem,
  getObject,
  setObject,
  setPartialToken,
  getPartialToken,
  clearPartialToken,
};