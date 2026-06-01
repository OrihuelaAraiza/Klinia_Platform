import { useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import InputField from "../components/InputField";
import ButtonPrimary from "../components/ButtonPrimary";
import AuthProviders from "../components/AuthProviders";
import ThemeToggle from "../components/ThemeToggle";
import auditService from "../services/auditService";
import {
  loginEmail as loginWithEmail,
  currentRole,
} from "../services/authService";
import { msalEnabled } from "../services/msal";
import storage from "../services/storage";
import {
  shouldBlock as shouldRateLimit,
  registerFail as registerRateLimitFail,
  reset as resetRateLimit,
} from "../services/rateLimiter";
import { ROLES, ROUTES } from "../utils/constants";
import { isValidEmail, isValidPassword } from "../utils/validators";
import { useToast } from "../components/UI/Toast";
import doctorImg from "../assets/hero/doctor-login.jpg";
import Logo from "../components/Brand/Logo";
import SelectionFlag from "../components/landing/SelectionFlag";
import DoodleScatter from "../components/DoodleScatter";
const INITIAL_FORM = {
  email: "",
  password: "",
};

const EMPTY_ERRORS = Object.freeze({});
const BLOCK_INITIAL_STATE = Object.freeze({ blocked: false, remainingMs: 0 });

function resolveDestination(role) {
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

function buildLimiterKey(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }
  const host = typeof window !== "undefined" ? window.location.hostname : "local";
  return `${normalizedEmail}::${host}`;
}

function formatBlockMessage(remainingMs) {
  const minutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  return `Demasiados intentos, vuelve a intentar en ${minutes} min.`;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = location.state?.from?.pathname;
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState(EMPTY_ERRORS);
  const [loading, setLoading] = useState(false);
  const [providersBusy, setProvidersBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [blockState, setBlockState] = useState(BLOCK_INITIAL_STATE);
  const toast = useToast();

  const [userType, setUserType] = useState("professional");

  const limiterKey = useMemo(() => buildLimiterKey(form.email), [form.email]);
  const combinedBusy = loading || providersBusy;
  const isBlocked = blockState.blocked;
  const displayedError = isBlocked
    ? formatBlockMessage(blockState.remainingMs)
    : formError;

  useEffect(() => {
    const token = storage.getToken();
    const role = currentRole();
    if (token && role) {
      navigate(resolveDestination(role), { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!limiterKey) {
      setBlockState(BLOCK_INITIAL_STATE);
      return;
    }
    const state = shouldRateLimit(limiterKey);
    setBlockState(state);
  }, [limiterKey]);

  useEffect(() => {
    if (!isBlocked || !limiterKey) {
      return;
    }
    const interval = setInterval(() => {
      const state = shouldRateLimit(limiterKey);
      setBlockState(state);
    }, 1_000);
    return () => clearInterval(interval);
  }, [isBlocked, limiterKey]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (formError) {
      setFormError("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationErrors = {};
    if (!isValidEmail(form.email)) {
      validationErrors.email = "Ingresa un correo electrónico válido.";
    }
    if (!isValidPassword(form.password)) {
      validationErrors.password =
        "La contraseña debe tener al menos 8 caracteres, con letras y números.";
    }

    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    if (limiterKey) {
      const limiterState = shouldRateLimit(limiterKey);
      if (limiterState.blocked) {
        setBlockState(limiterState);
        setFormError("");
        return;
      }
    }

    setLoading(true);
    setFormError("");

    try {
      const session = await loginWithEmail({
        email: form.email.trim(),
        password: form.password,
      });

      if (limiterKey) {
        resetRateLimit(limiterKey);
        setBlockState(BLOCK_INITIAL_STATE);
      }

      // Log audit asynchronously - don't block navigation
      auditService.logAudit(
        "auth_login_success",
        { method: "password", role: session.user?.role },
        { auth: true, silent: true }
      ).catch(() => {
        // Silently fail - audit logging should never block login
      });

      const destination = fromPath || resolveDestination(session.user?.role);
      navigate(destination, { replace: true });
    } catch (error) {
      const isNetworkError = error?.code === "NETWORK_ERROR";
      const fallbackMessage = isNetworkError
        ? "No se pudo iniciar sesión. Verifica tu conexión."
        : "Credenciales no válidas. Revisa tu correo y contraseña.";
      const message = error?.message || fallbackMessage;
      setFormError(isBlocked ? "" : message);

      toast.error(message);

      await auditService.logAudit(
        "auth_login_failed",
        {
          method: "password",
          code: error?.status || error?.code,
          message,
        },
        { auth: false }
      );

      if (limiterKey) {
        const limiterResult = registerRateLimitFail(limiterKey);
        setBlockState(limiterResult);
      }
    } finally {
      setLoading(false);
    }
  };

  const heroCopy =
    userType === "professional"
      ? {
          title: "Portal Profesionales",
          subtitle: "Gestiona tus consultas y pacientes.",
        }
      : {
          title: "Portal Pacientes",
          subtitle: "Accede a tu historial y recetas.",
        };

  return (
    <div className="login-page">
      <DoodleScatter />
      <SelectionFlag ctaLabel="Crear cuenta paciente" ctaTo="/register/patient" />
      <div className="login-layout">
        <section className="login-card">
          <header className="login-card__header">
            <Logo
              variant="horizontal"
              size="lg"
              theme="auto"
              alt="ROMI TBE"
              className="login-logo"
            />
            <ThemeToggle className="login-theme-toggle" />
          </header>
          <div className="stack-1">
            <h1 className="login-title">{heroCopy.title}</h1>
            <p className="login-subtitle">{heroCopy.subtitle}</p>
          </div>

          <div className="login-toggle">
            <button
              type="button"
              className={`login-toggle__btn ${
                userType === "professional" ? "is-active" : ""
              }`}
              onClick={() => setUserType("professional")}
            >
              Soy Especialista
            </button>
            <button
              type="button"
              className={`login-toggle__btn ${
                userType === "patient" ? "is-active" : ""
              }`}
              onClick={() => setUserType("patient")}
            >
              Soy Paciente
            </button>
          </div>


          <form className="form" onSubmit={handleSubmit} noValidate>
            <InputField
              label="Email"
              type="email"
              value={form.email}
              onChange={handleChange}
              name="email"
              autoComplete="email"
              required
              placeholder="tu@correo.com"
              error={errors.email}
            />

            <InputField
              label="Contraseña"
              type="password"
              value={form.password}
              onChange={handleChange}
              name="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              error={errors.password}
            />

            <div className="form__actions">
              <Link to="/forgot-password" className="link">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <ButtonPrimary
              type="submit"
              disabled={combinedBusy || isBlocked}
              loading={loading}
              fullWidth
            >
              {loading ? "Validando…" : "Iniciar sesión"}
            </ButtonPrimary>
            {/*
            {msalEnabled ? (
              <AuthProviders
                disabled={combinedBusy || isBlocked}
                onBusyChange={setProvidersBusy}
                onSuccess={(response) => {
                  if (limiterKey) {
                    resetRateLimit(limiterKey);
                    setBlockState(BLOCK_INITIAL_STATE);
                  }
                  if (response?.user) {
                    const destination = fromPath || resolveDestination(response.user.role);
                    navigate(destination, { replace: true });
                    return;
                  }
                  if (response?.partialToken) {
                    navigate(ROUTES.register, {
                      state: { partialToken: response.partialToken },
                    });
                  }
                }}
                onError={() => {
                  if (limiterKey) {
                    const limiterState = shouldRateLimit(limiterKey);
                    setBlockState(limiterState);
                  }
                }}
              />
            ) : import.meta.env.DEV ? (
              <small className="hint">
                Configura VITE_MSAL_CLIENT_ID y el tenant para habilitar Microsoft.
              </small>
            ) : null}
            */}

            {displayedError ? (
              <p className="form__error" role="alert">
                {displayedError}
              </p>
            ) : null}

            <div
              className="register"
              style={{
                borderTop: "1px solid var(--border)",
                paddingTop: "1rem",
                marginTop: "1rem",
              }}
            >
              <p style={{ margin: 0 }}>
                {userType === "professional"
                  ? "¿Eres nuevo en ROMI TBE?"
                  : "¿Primera vez aquí?"}
              </p>

              <Link
                className="link"
                to={
                  userType === "professional"
                    ? ROUTES.register
                    : "/register/patient"
                }
                style={{ display: "block", marginTop: "0.25rem", fontSize: "1rem" }}
              >
                {userType === "professional"
                  ? "Registrar mi Consultorio"
                  : "Crear cuenta de Paciente"}
              </Link>
            </div>
          </form>
        </section>
        <Motion.aside
          className="login-hero"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <img
            src={doctorImg}
            alt="Profesional de salud usando la plataforma ROMI TBE"
            className="login-hero__image"
          />
        </Motion.aside>
      </div>
    </div>
  );
}
