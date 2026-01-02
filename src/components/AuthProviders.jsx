import { useCallback, useState } from "react";
import { loginWithMicrosoft as msalLoginPopup, msalEnabled } from "../services/msal";
import auditService from "../services/auditService";
import { useToast } from "./UI/Toast";
import microsoftLogo from "../assets/logos/microsoft-icon.png";
import authService from "../services/authService";

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
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
    if (disabled || loading) {
      return;
    }
    setBusy(true);
    setErrorMessage("");

    try {
      const msalResponse = await msalLoginPopup();
      const idToken = msalResponse?.idToken;

      if (!idToken) {
        throw new Error("No se pudo obtener el token de Microsoft.");
      }

      const backendResponse = await authService.loginMicrosoft(idToken);
      if (typeof onSuccess === "function") {
        onSuccess(backendResponse);
      }
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
          { auth: false, silent: true }
        )
        .catch(() => {
          // Silently fail - audit logging should never block the UI
        });

      toast.error(friendly);

      if (typeof onError === "function") {
        onError(error);
      }
    } finally {
      setBusy(false);
    }
  };

  const microsoftDisabled = disabled || loading;

  if (!msalEnabled) {
    return null;
  }

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
    </div>
  );
}
