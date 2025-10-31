import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithMicrosoft, getMsalConfig } from "../services/msal";
import auditService from "../services/auditService";
import { useToast } from "./UI/Toast";
import microsoftLogo from "../assets/logos/microsoft-icon.png";
import { ROLES, ROUTES } from "../utils/constants";

function resolveRedirect(role) {
  switch (role) {
    case ROLES.ADMIN:
      return ROUTES.dashboard;
    case ROLES.PROFESSIONAL:
    case ROLES.ASSISTANT:
      return ROUTES.patients;
    default:
      return ROUTES.dashboard;
  }
}

function mapErrorMessage(error) {
  const code = error?.code;
  if (code === "user_cancelled" || code === "popup_window_closed") {
    return "Inicio con Microsoft cancelado.";
  }
  if (code === "popup_window_error" || code === "popup_window_open_error") {
    return "El navegador bloqueó la ventana emergente. Habilítala e intenta de nuevo.";
  }
  if (code === "interaction_in_progress") {
    return "Ya hay un inicio de sesión con Microsoft en progreso. Espera unos segundos.";
  }
  if (code === "backend_unavailable" || code === 404 || code === 500) {
    return "Servicio temporalmente no disponible.";
  }
  return error?.message || "No se pudo completar el inicio con Microsoft. Intenta de nuevo.";
}

export default function AuthProviders({
  disabled = false,
  onSuccess,
  onError,
  onBusyChange,
}) {
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [configHint, setConfigHint] = useState("");

  useEffect(() => {
    try {
      getMsalConfig();
      setConfigHint("");
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn("[msal] Configuración inválida", error);
      }
      setConfigHint(
        "Configura VITE_MSAL_CLIENT_ID y el tenant (VITE_MSAL_TENANT_ID o VITE_MSAL_AUTHORITY)."
      );
    }
  }, []);

  const setBusy = useCallback(
    (value) => {
      setLoading(value);
      if (typeof onBusyChange === "function") {
        onBusyChange(value);
      }
    },
    [onBusyChange]
  );

  const handleMicrosoft = async () => {
    if (disabled || loading || configHint) {
      return;
    }
    setBusy(true);
    setErrorMessage("");

    try {
      const { user, role } = await loginWithMicrosoft();

      auditService
        .logAudit(
          "auth_login_success",
          { method: "microsoft", email: user?.email, role },
          { auth: true }
        )
        .catch((error) => {
          if (import.meta.env.DEV) {
            console.warn("[audit] microsoft login success audit failed", error);
          }
        });

      toast.success("Sesión iniciada con Microsoft.");

      if (typeof onSuccess === "function") {
        onSuccess({ user, role });
      }

      navigate(resolveRedirect(role), { replace: true });
    } catch (error) {
      const friendly = mapErrorMessage(error);
      setErrorMessage(friendly);

      auditService
        .logAudit(
          "auth_login_failed",
          {
            method: "microsoft",
            email: error?.email,
            reason: error?.code || error?.message,
          },
          { auth: false }
        )
        .catch((auditError) => {
          if (import.meta.env.DEV) {
            console.warn("[audit] microsoft login failure audit failed", auditError);
          }
        });

      toast.danger(friendly);

      if (typeof onError === "function") {
        onError(error);
      }
    } finally {
      setBusy(false);
    }
  };

  const microsoftDisabled = disabled || loading || Boolean(configHint);

  return (
    <div className="auth-providers">
      <button
        type="button"
        className="btn-microsoft btn-full"
        onClick={handleMicrosoft}
        disabled={microsoftDisabled}
        aria-busy={loading || undefined}
      >
        <img
          src={microsoftLogo}
          alt=""
          aria-hidden="true"
          className="msft-logo-img"
        />
        <span>{loading ? "Conectando con Microsoft…" : "Continuar con Microsoft"}</span>
      </button>

      {errorMessage ? (
        <p className="auth-providers__error" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {configHint ? <p className="auth-providers__hint">{configHint}</p> : null}
    </div>
  );
}
