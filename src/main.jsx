import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles/theme.css";
import "./styles/global.css";
import "./styles/doodle-app.css";
import { initMsal } from "./services/msal";
import { hydrateSession } from "./services/authService";

try {
  await initMsal();
} catch (error) {
  if (import.meta.env.DEV) {
    console.warn("[MSAL] Inicialización omitida:", error?.message || error);
  }
}

// Refresca el usuario en localStorage con el payload más reciente del store.
// Indispensable para que cambios al schema del user (p. ej. nueva `specialty`)
// se apliquen sin requerir un logout manual. Se await-ea para evitar el flash
// de UI logueado con datos viejos antes de que el backend valide la sesión.
try {
  await hydrateSession();
} catch (error) {
  if (import.meta.env.DEV) {
    console.warn("[auth] hydrateSession falló:", error?.message || error);
  }
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
