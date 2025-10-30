import { useEffect, useState, useId } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import InputField from "../components/InputField";
import ButtonPrimary from "../components/ButtonPrimary";
import auditService from "../services/auditService";
import authService from "../services/authService";
import storage from "../services/storage";
import { ROLES, ROUTES } from "../utils/constants";
import { isValidEmail } from "../utils/validators";
import doctorImg from "../assets/hero/doctor-login.jpg";
import logo from "../assets/logo-romi.svg";

const INITIAL_STATE = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "",
};

const ROLE_OPTIONS = [
  { value: ROLES.ADMIN, label: "Administrador" },
  { value: ROLES.PROFESSIONAL, label: "Profesional" },
  { value: ROLES.ASSISTANT, label: "Asistente" },
];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_STATE);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const token = storage.getToken();
    const role = storage.getRole();
    if (token && role) {
      redirectByRole(role);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const validationErrors = {};

    if (!form.name.trim()) {
      validationErrors.name = "Ingresa tu nombre completo.";
    }

    if (!isValidEmail(form.email)) {
      validationErrors.email = "Ingresa un correo electrónico válido.";
    }

    if (!form.password || form.password.length < 8) {
      validationErrors.password = "La contraseña debe tener al menos 8 caracteres.";
    }

    if (form.password !== form.confirmPassword) {
      validationErrors.confirmPassword = "Las contraseñas no coinciden.";
    }

    if (!form.role) {
      validationErrors.role = "Selecciona un rol de acceso.";
    }

    return validationErrors;
  };

  const redirectByRole = (role) => {
    if (role === ROLES.ASSISTANT) {
      navigate(ROUTES.sessions, { replace: true });
    } else {
      navigate(ROUTES.dashboard, { replace: true });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const user = await authService.register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });

      setSuccessMessage("Cuenta creada correctamente. Redirigiendo...");
      await auditService.logAudit("register", {
        role: user.role,
        email: user.email ?? form.email.trim(),
      });

      redirectByRole(user.role);
    } catch (error) {
      if (error.code === "NETWORK_ERROR") {
        setErrorMessage(
          "No se pudo contactar al servidor. Revisa tu conexión o la URL del API."
        );
      } else {
        setErrorMessage(
          error.message || "No fue posible crear la cuenta. Intenta nuevamente."
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

          <h1 className="login-title">Crear cuenta</h1>
          <p className="login-subtitle">
            Registra tu acceso para gestionar expedientes clínicos con Klinia.
          </p>

          <form className="form" onSubmit={handleSubmit} noValidate>
            <InputField
              label="Nombre completo"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Nombre y apellidos"
              required
              autoComplete="name"
              error={errors.name}
            />

            <InputField
              label="Correo electrónico"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="profesional@klinialabs.mx"
              required
              autoComplete="email"
              error={errors.email}
            />

            <InputField
              label="Contraseña"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              error={errors.password}
            />

            <InputField
              label="Confirmar contraseña"
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Repite tu contraseña"
              required
              autoComplete="new-password"
              error={errors.confirmPassword}
            />

            <RoleSelect value={form.role} onChange={handleChange} error={errors.role} />

            <ButtonPrimary type="submit" disabled={loading} fullWidth>
              {loading ? "Creando cuenta…" : "Registrar cuenta"}
            </ButtonPrimary>

            {errorMessage ? (
              <p className="form-error" role="alert">
                {errorMessage}
              </p>
            ) : null}

            {successMessage ? (
              <p className="helper-text" role="status" aria-live="polite">
                {successMessage}
              </p>
            ) : null}

            <p className="register">
              ¿Ya tienes cuenta?{" "}
              <Link className="link" to={ROUTES.login}>
                Inicia sesión
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

function RoleSelect({ value, onChange, error }) {
  const inputId = useId();

  return (
    <div className="input-field">
      <label htmlFor={inputId} className="input-field__label">
        Rol
      </label>
      <select
        id={inputId}
        name="role"
        value={value}
        onChange={onChange}
        className={`role-select${error ? " has-error" : ""}`}
        required
        aria-invalid={Boolean(error)}
      >
        <option value="">Selecciona un rol</option>
        {ROLE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="input-field__feedback is-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
