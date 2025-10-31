import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles/global.css";
import { initMsal } from "./services/msal";

try {
  await initMsal();
} catch (error) {
  if (import.meta.env.DEV) {
    console.warn("[MSAL] Inicialización omitida:", error?.message || error);
  }
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
