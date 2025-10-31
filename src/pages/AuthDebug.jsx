import { useMemo } from "react";
import { getMsalConfig } from "../services/msal";

function maskValue(value) {
  if (!value) {
    return "(sin configurar)";
  }
  if (value.length <= 12) {
    return value;
  }
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function getWarnings(values) {
  const warnings = [];
  Object.entries(values).forEach(([key, value]) => {
    if (!value) {
      warnings.push(`El valor de ${key} está vacío.`);
    } else if (value.toLowerCase().includes("replace_me")) {
      warnings.push(`El valor de ${key} contiene 'replace_me'.`);
    }
  });
  return warnings;
}

export default function AuthDebug() {
  const envValues = useMemo(() => {
    const info = {
      clientId: import.meta.env.VITE_MSAL_CLIENT_ID || "",
      tenantId: import.meta.env.VITE_MSAL_TENANT_ID || "",
      authority:
        import.meta.env.VITE_MSAL_AUTHORITY ||
        (import.meta.env.VITE_MSAL_TENANT_ID
          ? `https://login.microsoftonline.com/${import.meta.env.VITE_MSAL_TENANT_ID}`
          : ""),
      redirectUri:
        import.meta.env.VITE_MSAL_REDIRECT_URI ||
        (typeof window !== "undefined" ? window.location.origin : ""),
    };

    try {
      const config = getMsalConfig();
      info.clientId = config.clientId;
      info.authority = config.authority;
      info.redirectUri = config.redirectUri || info.redirectUri;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn("[AuthDebug] Configuración MSAL inválida", error);
      }
    }

    return info;
  }, []);

  const warnings = useMemo(
    () => getWarnings(envValues),
    [envValues]
  );

  return (
    <div className="login-shell" style={{ display: "block", padding: "2rem" }}>
      <section className="login-card" style={{ margin: "0 auto" }}>
        <h1 className="login-title">Diagnóstico de MSAL</h1>
        <p className="login-subtitle">
          Usa esta vista para validar que tus variables de entorno estén listas antes de probar
          el flujo de Microsoft.
        </p>

        <dl className="stack-2">
          <div>
            <dt>clientId</dt>
            <dd>{maskValue(envValues.clientId)}</dd>
          </div>
          <div>
            <dt>authority</dt>
            <dd>{envValues.authority || "(sin configurar)"}</dd>
          </div>
          <div>
            <dt>redirectUri</dt>
            <dd>{envValues.redirectUri || "(sin configurar)"}</dd>
          </div>
        </dl>

        {warnings.length ? (
          <div className="auth-providers__error" role="alert">
            <strong>Advertencias:</strong>
            <ul>
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="helper-text">No se detectaron placeholders ni valores faltantes.</p>
        )}
      </section>
    </div>
  );
}
