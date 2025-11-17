import {
  PublicClientApplication,
  InteractionRequiredAuthError,
} from "@azure/msal-browser";
import { loginMicrosoft as exchangeMicrosoftLogin } from "./authService";

const DEFAULT_SCOPES = ["openid", "profile", "email"];

const clientId = (import.meta.env.VITE_MSAL_CLIENT_ID || "").trim();
const tenantId = (import.meta.env.VITE_MSAL_TENANT_ID || "").trim();
const authorityEnv = (import.meta.env.VITE_MSAL_AUTHORITY || "").trim();
const authority = authorityEnv || (tenantId ? `https://login.microsoftonline.com/${tenantId}` : "");
const redirectEnv = (import.meta.env.VITE_MSAL_REDIRECT_URI || "").trim();
const postLogoutEnv = (import.meta.env.VITE_MSAL_POST_LOGOUT_REDIRECT_URI || "").trim();
const cacheLocation = (import.meta.env.VITE_MSAL_CACHE || "sessionStorage").trim();

export const msalEnabled = Boolean(clientId && authority);

let msalInstance;
let initPromise;
let interactionInFlight = false;
let cachedConfig;

function buildMsalConfig() {
  if (!msalEnabled) {
    return null;
  }

  if (cachedConfig) {
    return cachedConfig;
  }

  const origin =
    redirectEnv || (typeof window !== "undefined" && window.location ? window.location.origin : "");
  const redirectUri = origin || undefined;
  const postLogoutRedirectUri =
    postLogoutEnv || redirectUri || (typeof window !== "undefined" ? window.location?.origin : undefined);

  cachedConfig = {
    auth: {
      clientId,
      authority,
      redirectUri,
      postLogoutRedirectUri,
    },
    cache: {
      cacheLocation: cacheLocation || "sessionStorage",
      storeAuthStateInCookie: cacheLocation === "localStorage",
    },
    system: {
      loggerOptions: {
        loggerCallback: (level, message, containsPii) => {
          if (!containsPii && import.meta.env.DEV) {
            console.debug("[MSAL]", level, message);
          }
        },
        piiLoggingEnabled: false,
      },
    },
  };

  return cachedConfig;
}

export function getMsalConfig() {
  return buildMsalConfig();
}

export const msalConfig = msalEnabled ? buildMsalConfig() : null;

function getMsalInstance() {
  if (!msalEnabled) {
    return null;
  }
  if (!msalInstance) {
    const config = buildMsalConfig();
    msalInstance = new PublicClientApplication(config);
  }
  return msalInstance;
}

async function ensureInitialized() {
  if (!msalEnabled) {
    return null;
  }
  const instance = getMsalInstance();
  if (!initPromise) {
    initPromise = (async () => {
      if (typeof instance.initialize === "function") {
        await instance.initialize();
      }
      try {
        await instance.handleRedirectPromise();
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("[MSAL] handleRedirectPromise warning", error);
        }
      }
      return instance;
    })();
  }
  try {
    await initPromise;
  } catch (error) {
    initPromise = undefined;
    throw error;
  }
  return instance;
}

function mapMsalError(error) {
  const code =
    error?.errorCode || error?.code || error?.name || "msal_unknown_error";
  const mapped = new Error(error?.errorMessage || error?.message || "Error con Microsoft.");
  mapped.code = code;
  mapped.cause = error;

  if (code === "user_cancelled" || code === "popup_window_closed") {
    mapped.message = "Inicio con Microsoft cancelado.";
  } else if (code === "popup_window_error" || code === "popup_window_open_error") {
    mapped.message =
      "El navegador bloqueó la ventana emergente. Habilítala e intenta de nuevo.";
  } else if (code === "interaction_in_progress") {
    mapped.message =
      "Ya hay un inicio de sesión con Microsoft en progreso. Intenta de nuevo en unos segundos.";
  } else if (code === "network_error") {
    mapped.message = "No se pudo completar el inicio con Microsoft. Intenta de nuevo.";
  }

  return mapped;
}

function mapBackendError(error) {
  const mapped = new Error(
    error?.message || "No se pudo completar el inicio con Microsoft. Intenta de nuevo."
  );
  mapped.code = error?.code || error?.status || "backend_error";
  mapped.cause = error;

  if (error?.status === 404 || error?.status >= 500) {
    mapped.message = "Servicio temporalmente no disponible.";
    mapped.code = "backend_unavailable";
  }

  return mapped;
}

async function performPopupLogin(instance) {
  if (interactionInFlight) {
    const error = new Error(
      "Ya hay un inicio de sesión con Microsoft en progreso. Intenta de nuevo en unos segundos."
    );
    error.code = "interaction_in_progress";
    throw error;
  }

  try {
    interactionInFlight = true;
    return await instance.loginPopup({
      scopes: DEFAULT_SCOPES,
      prompt: "select_account",
    });
  } catch (error) {
    throw mapMsalError(error);
  } finally {
    interactionInFlight = false;
  }
}

export async function initMsal() {
  if (!msalEnabled) {
    return null;
  }
  return ensureInitialized();
}

export async function loginWithMicrosoft() {
  if (!msalEnabled) {
    const error = new Error("Inicio con Microsoft no disponible en este entorno.");
    error.code = "msal_disabled";
    throw error;
  }
  getMsalConfig();
  const instance = await ensureInitialized();
  let account = instance.getActiveAccount() || null;
  if (!account) {
    const accounts = instance.getAllAccounts();
    account = accounts.length > 0 ? accounts[0] : null;
    if (account) {
      instance.setActiveAccount(account);
    }
  }

  let authResult;
  if (account) {
    try {
      authResult = await instance.acquireTokenSilent({
        account,
        scopes: DEFAULT_SCOPES,
      });
    } catch (error) {
      if (
        error instanceof InteractionRequiredAuthError ||
        error?.errorCode === "interaction_required"
      ) {
        authResult = await performPopupLogin(instance);
      } else {
        throw mapMsalError(error);
      }
    }
  } else {
    authResult = await performPopupLogin(instance);
  }

  const activeAccount = authResult.account;
  if (activeAccount) {
    instance.setActiveAccount(activeAccount);
  }

  const idToken = authResult.idToken;
  if (!idToken) {
  const error = new Error("No se recibió un token de Microsoft.");
  error.code = "missing_token";
    throw error;
 }

  
 return authResult;
}


export function getActiveAccount() {
  if (!msalEnabled) {
    return null;
  }
  const instance = msalInstance;
  if (!instance) {
    return null;
  }
  return instance.getActiveAccount() || instance.getAllAccounts()[0] || null;
}

export async function logoutMsal() {
  if (!msalEnabled) {
    return null;
  }
  const instance = await ensureInitialized();
  const account = instance.getActiveAccount() || instance.getAllAccounts()[0] || undefined;
  try {
    await instance.logoutPopup({
      account,
      postLogoutRedirectUri: getMsalConfig()?.auth?.postLogoutRedirectUri,
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[MSAL] logout warning", error);
    }
  }
}

export default {
  initMsal,
  loginWithMicrosoft,
  getActiveAccount,
  logoutMsal,
  getMsalConfig,
  msalEnabled,
};
