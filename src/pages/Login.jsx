import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import InputField from "../components/InputField";
import ButtonPrimary from "../components/ButtonPrimary";
import auditService from "../services/auditService";
import authService from "../services/authService";
import { loginMicrosoft } from "../services/msal";
import storage from "../services/storage";
import { ROLES, ROUTES } from "../utils/constants";
import { isValidEmail, isValidPassword } from "../utils/validators";
import doctorImg from "../assets/hero/doctor-login.jpg";
import logo from "../assets/logo-romi.svg";
import microsoftLogo from "../assets/logos/microsoft-icon.png";

const INITIAL_FORM = {
  email: "",
  password: "",
};

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const existingToken = storage.getToken();
    const existingRole = storage.getRole();
    if (existingToken && existingRole) {
      const destination =
        existingRole === ROLES.ASSISTANT ? ROUTES.sessions : ROUTES.dashboard;
      navigate(destination, { replace: true });
    }
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationErrors = {};
    if (!isValidEmail(form.email)) {
      validationErrors.email = "Ingresa un correo electrónico válido.";
    }
    if (!isValidPassword(form.password)) {
      validationErrors.password = "La contraseña debe tener al menos 6 caracteres.";
    }

    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await authService.login(form.email, form.password);
      auditService.logAudit("login", {
        channel: "password",
        role: response.user.role,
      });
      const destination =
        response.user.role === ROLES.ASSISTANT
          ? ROUTES.sessions
          : ROUTES.dashboard;
      navigate(destination, { replace: true });
    } catch (error) {
      if (error.code === "NETWORK_ERROR") {
        setErrorMessage(
          "No se pudo contactar al servidor. Revisa tu conexión o la URL del API."
        );
      } else {
        setErrorMessage(
          error.message || "No fue posible iniciar sesión. Intenta nuevamente."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoft = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const response = await loginMicrosoft();
      auditService.logAudit("login", {
        channel: "microsoft",
        role: response.user.role,
      });

      const destination =
        response.user.role === ROLES.ASSISTANT
          ? ROUTES.sessions
          : ROUTES.dashboard;
      navigate(destination, { replace: true });
    } catch (error) {
      if (error.code === "NETWORK_ERROR") {
        setErrorMessage(
          "No se pudo contactar al servidor. Revisa tu conexión o la URL del API."
        );
      } else {
        setErrorMessage(
          error.message || "No pudimos conectar con Microsoft en este momento."
        );
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

            <ButtonPrimary type="submit" disabled={loading} fullWidth>
              {loading ? "Validando..." : "Iniciar sesión"}
            </ButtonPrimary>

            <button
              type="button"
              className="btn-microsoft btn-full"
              onClick={handleMicrosoft}
              disabled={loading}
            >
              <img
                src={microsoftLogo}
                alt=""
                aria-hidden="true"
                className="msft-logo-img"
              />
              <span>Continuar con Microsoft</span>
            </button>

            {errorMessage ? (
              <p className="form__error" role="alert">
                {errorMessage}
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
