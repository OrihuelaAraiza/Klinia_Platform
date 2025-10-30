import { PublicClientApplication } from "@azure/msal-browser";
import {
  setToken,
  setUser,
  setRole,
} from "./storage";
import { ROLES } from "../utils/constants";

const clientId = import.meta.env.VITE_MSAL_CLIENT_ID;
const tenantId = import.meta.env.VITE_MSAL_TENANT_ID || "common";
const redirectUri = import.meta.env.VITE_MSAL_REDIRECT_URI;

const msalConfig = {
  auth: {
    clientId: clientId ?? "",
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: redirectUri ?? (typeof window !== "undefined" ? window.location.origin : undefined),
  },
  cache: { cacheLocation: "localStorage", storeAuthStateInCookie: false },
};

export const msalInstance = new PublicClientApplication(msalConfig);

let initialized = false;

export async function initMsal() {
  if (initialized) {
    return;
  }
  if (typeof msalInstance.initialize === "function") {
    await msalInstance.initialize();
  }
  try {
    await msalInstance.handleRedirectPromise();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[msal] Redirect handling warning", error);
    }
  }
  initialized = true;
}

export async function loginMicrosoft() {
  if (!initialized) {
    await initMsal();
  }

  const result = await msalInstance.loginPopup({
    scopes: ["openid", "profile", "email"],
    prompt: "select_account",
  });

  const account = result.account ?? msalInstance.getAllAccounts()[0] ?? null;
  const idToken = result.idToken;

  if (!idToken) {
    throw new Error("No se recibió un token de Microsoft");
  }

  // TODO: Integrate backend exchange via api when available.
  const user = {
    id: account?.homeAccountId ?? `msal-${Date.now()}`,
    name: account?.name ?? "Usuario Klinia",
    email: account?.username ?? "",
    role: ROLES.PROFESSIONAL,
  };

  setToken(idToken);
  setUser(user);
  setRole(user.role);

  return {
    token: idToken,
    user,
  };
}

export default {
  initMsal,
  loginMicrosoft,
  instance: msalInstance,
};
