import {
  PublicClientApplication,
  InteractionRequiredAuthError,
} from "@azure/msal-browser";
import { loginMicrosoft as exchangeMicrosoftLogin } from "./authService";

const DEFAULT_SCOPES = ["openid", "profile", "email"];

let msalInstance;
let initPromise;
let interactionInFlight = false;

export function getMsalConfig() {
  const clientIdRaw = import.meta.env.VITE_MSAL_CLIENT_ID;
  const tenantId = import.meta.env.VITE_MSAL_TENANT_ID || "common";
  const authority =
    import.meta.env.VITE_MSAL_AUTHORITY ||
    `https://login.microsoftonline.com/${tenantId}`;
  const redirectRaw = import.meta.env.VITE_MSAL_REDIRECT_URI;
  const resolvedRedirect =
    typeof redirectRaw === "string" && redirectRaw.trim().length > 0
      ? redirectRaw.trim()
      : typeof window !== "undefined"
        ? `${window.location.origin}/`
        : undefined;

  const clientId = typeof clientIdRaw === "string" ? clientIdRaw.trim() : "";

  if (!clientId || clientId.toLowerCase().includes("replace_me")) {
    throw new Error("MSAL: VITE_MSAL_CLIENT_ID no configurado");
  }

  const authorityNormalized = authority?.trim() || "";
  if (
    !authorityNormalized ||
    authorityNormalized.toLowerCase().includes("replace_me") ||
    authorityNormalized.endsWith("/replace_me")
  ) {
    throw new Error(
      "MSAL: tenant inválido. Configura VITE_MSAL_TENANT_ID o VITE_MSAL_AUTHORITY"
    );
  }

  return {
    clientId,
    authority: authorityNormalized,
    redirectUri: resolvedRedirect,
  };
}

function buildMsalConfig() {
  const base = getMsalConfig();
  return {
    auth: {
      clientId: base.clientId,
      authority: base.authority,
      redirectUri: base.redirectUri,
    },
    cache: {
      cacheLocation: "localStorage",
      storeAuthStateInCookie: true,
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
}

function getMsalInstance() {
  if (!msalInstance) {
    const config = buildMsalConfig();
    msalInstance = new PublicClientApplication(config);
  }
  return msalInstance;
}

async function ensureInitialized() {
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
  return ensureInitialized();
}

export async function loginWithMicrosoft() {
  // Validamos la configuración antes de arrancar MSAL.
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

  try {
    const session = await exchangeMicrosoftLogin(idToken);
    const user = session?.user ?? null;
    return {
      user,
      role: user?.role ?? null,
    };
  } catch (error) {
    throw mapBackendError(error);
  }
}

export function getActiveAccount() {
  const instance = msalInstance;
  if (!instance) {
    return null;
  }
  return instance.getActiveAccount() || instance.getAllAccounts()[0] || null;
}

export async function logoutMsal() {
  const instance = await ensureInitialized();
  const account = instance.getActiveAccount() || instance.getAllAccounts()[0] || undefined;
  try {
    await instance.logoutPopup({
      account,
      postLogoutRedirectUri: getMsalConfig().redirectUri,
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
};
