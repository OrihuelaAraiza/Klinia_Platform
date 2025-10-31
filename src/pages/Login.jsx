import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import InputField from "../components/InputField";
import ButtonPrimary from "../components/ButtonPrimary";
import AuthProviders from "../components/AuthProviders";
import auditService from "../services/auditService";
import {
  loginEmail as loginWithEmail,
  currentRole,
} from "../services/authService";
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
import logo from "../assets/logo-romi.svg";

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
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState(EMPTY_ERRORS);
  const [loading, setLoading] = useState(false);
  const [providersBusy, setProvidersBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [blockState, setBlockState] = useState(BLOCK_INITIAL_STATE);
  const toast = useToast();

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

      await auditService.logAudit(
        "auth_login_success",
        { method: "password", role: session.user?.role },
        { auth: true }
      );

      navigate(resolveDestination(session.user?.role), { replace: true });
    } catch (error) {
      const isNetworkError = error?.code === "NETWORK_ERROR";
      const fallbackMessage = isNetworkError
        ? "No se pudo iniciar sesión. Verifica tu conexión."
        : "Credenciales no válidas. Revisa tu correo y contraseña.";
      const message = error?.message || fallbackMessage;
      setFormError(isBlocked ? "" : message);

      toast.danger(message);

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

  return (
    <div className="login-shell">
      <section className="login-left">
        <div className="login-card">
          <img src={logo} alt="ROMI Klinia" className="login-logo" />

          <h1 className="login-title">Inicio de sesión</h1>
          <p className="login-subtitle">
            Bienvenido de vuelta. Ingresa tus credenciales para continuar.
          </p>

          <form className="form" onSubmit={handleSubmit} noValidate>
            <InputField
              label="Email"
              type="email"
              value={form.email}
              onChange={handleChange}
              name="email"
              autoComplete="email"
              required
              placeholder="profesional@klinialabs.mx"
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
              <a href="#" className="link">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <ButtonPrimary
              type="submit"
              disabled={combinedBusy || isBlocked}
              loading={loading}
              fullWidth
            >
              {loading ? "Validando…" : "Iniciar sesión"}
            </ButtonPrimary>

            <AuthProviders
              disabled={combinedBusy || isBlocked}
              onBusyChange={setProvidersBusy}
              onSuccess={() => {
                if (limiterKey) {
                  resetRateLimit(limiterKey);
                  setBlockState(BLOCK_INITIAL_STATE);
                }
              }}
              onError={() => {
                if (limiterKey) {
                  const limiterState = shouldRateLimit(limiterKey);
                  setBlockState(limiterState);
                }
              }}
            />

            {displayedError ? (
              <p className="form__error" role="alert">
                {displayedError}
              </p>
            ) : null}

            <p className="register">
              ¿No tienes cuenta?{" "}
              <Link className="link" to={ROUTES.register}>
                Regístrate
              </Link>
            </p>
          </form>
        </div>
      </section>

      <motion.section
        className="login-right"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <img
          src={doctorImg}
          alt="Profesional de salud usando un móvil"
          className="hero-img"
        />
      </motion.section>
    </div>
  );
}
