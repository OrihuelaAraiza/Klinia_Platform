import { useEffect, useId, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import InputField from "../components/InputField";
import ButtonPrimary from "../components/ButtonPrimary";
import auditService from "../services/auditService";
import {
  register as registerAccount,
  currentRole,
} from "../services/authService";
import storage from "../services/storage";
import { ROLES, ROUTES } from "../utils/constants";
import { isValidEmail, isValidPassword } from "../utils/validators";
import { useToast } from "../components/UI/Toast";
import doctorImg from "../assets/hero/doctor-login.jpg";
import logo from "../assets/logo-romi.svg";

const INITIAL_STATE = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "",
  acceptPolicies: false,
};

const ROLE_OPTIONS = [
  { value: ROLES.ADMIN, label: "Administrador" },
  { value: ROLES.PROFESSIONAL, label: "Profesional" },
  { value: ROLES.ASSISTANT, label: "Asistente" },
];

const EMPTY_ERRORS = Object.freeze({});

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

export default function Register() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(INITIAL_STATE);
  const [errors, setErrors] = useState(EMPTY_ERRORS);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const sanitizedEmail = useMemo(
    () => form.email.trim().toLowerCase(),
    [form.email]
  );

  useEffect(() => {
    const token = storage.getToken();
    const role = currentRole();
    if (token && role) {
      navigate(resolveDestination(role), { replace: true });
    }
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    const nextValue = type === "checkbox" ? checked : value;
    setForm((prev) => ({ ...prev, [name]: nextValue }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (formError) {
      setFormError("");
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

    if (!isValidPassword(form.password)) {
      validationErrors.password =
        "La contraseña debe tener al menos 8 caracteres, con letras y números.";
    }

    if (form.password !== form.confirmPassword) {
      validationErrors.confirmPassword = "Las contraseñas no coinciden.";
    }

    if (!form.role) {
      validationErrors.role = "Selecciona un rol de acceso.";
    }

    if (!form.acceptPolicies) {
      validationErrors.acceptPolicies = "Debes aceptar el Aviso de Privacidad y Términos.";
    }

    return validationErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setLoading(true);
    setFormError("");

    try {
      const payload = {
        name: form.name.trim(),
        email: sanitizedEmail,
        password: form.password,
        role: form.role,
        acceptPolicies: form.acceptPolicies,
      };

      const response = await registerAccount(payload);
      const user = response?.user ?? null;

      await auditService.logAudit(
        "auth_register_success",
        {
          role: user?.role ?? form.role,
          email: user?.email ?? sanitizedEmail,
        },
        { auth: false }
      );

      toast.success("Cuenta creada. Ahora puedes iniciar sesión.");

      navigate(ROUTES.login, { replace: true });
    } catch (error) {
      const isConflict = error?.status === 409;
      const isNetwork = error?.code === "NETWORK_ERROR";
      const fallbackMessage = isConflict
        ? "Este correo ya está registrado."
        : isNetwork
        ? "No se pudo registrar. Verifica tu conexión."
        : "No fue posible crear la cuenta. Intenta nuevamente.";
      const message = error?.message || fallbackMessage;
      setFormError(message);
      toast.danger(message);

      await auditService.logAudit(
        "auth_register_failed",
        {
          role: form.role,
          email: sanitizedEmail,
          code: error?.status || error?.code,
          message,
        },
        { auth: false }
      );
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

            <PoliciesCheckbox
              checked={form.acceptPolicies}
              onChange={handleChange}
              error={errors.acceptPolicies}
            />

            <ButtonPrimary type="submit" disabled={loading} loading={loading} fullWidth>
              {loading ? "Creando cuenta…" : "Registrar cuenta"}
            </ButtonPrimary>

            {formError ? (
              <p className="form-error" role="alert">
                {formError}
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
    <InputField label="Rol" name="role" error={error} required>
      {({ controlId, describedBy }) => (
        <select
          id={controlId}
          name="role"
          value={value}
          onChange={onChange}
          className={`role-select${error ? " has-error" : ""}`}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
        >
          <option value="">Selecciona un rol</option>
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </InputField>
  );
}

function PoliciesCheckbox({ checked, onChange, error }) {
  const checkboxId = useId();
  const messageId = `${checkboxId}-message`;

  return (
    <div className={`policies-check${error ? " has-error" : ""}`}>
      <div className="policies-check__control">
        <input
          id={checkboxId}
          type="checkbox"
          name="acceptPolicies"
          checked={checked}
          onChange={onChange}
          aria-describedby={error ? messageId : undefined}
          aria-invalid={Boolean(error)}
          required
        />
        <label htmlFor={checkboxId}>
          Acepto el Aviso de Privacidad y Términos.
        </label>
      </div>
      {error ? (
        <p id={messageId} className="policies-check__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
