import InputField from "../InputField";

export default function StepAccess({
  data,
  errors,
  onChange,
  disabled = false,
}) {
  const handleChange = (event) => {
    const { name, value } = event.target;
    onChange?.(name, value);
  };

  return (
    <div className="register-step">
      <div className="register-step__header">
        <h2 className="register-step__title">Acceso</h2>
        <p className="register-step__subtitle">
          Crea las credenciales que usarás para acceder a BreveMente.
        </p>
      </div>

      <div className="register-step__body">
        <InputField
          label="Correo electrónico"
          type="email"
          name="email"
          value={data.email}
          onChange={handleChange}
          required
          autoComplete="email"
          placeholder="profesional@brevemente.mx"
          error={errors.email}
          disabled={disabled}
        />

        <InputField
          label="Contraseña"
          type="password"
          name="password"
          value={data.password}
          onChange={handleChange}
          required
          autoComplete="new-password"
          placeholder="••••••••"
          assistiveText="Al menos 8 caracteres con letras y numeros."
          error={errors.password}
          disabled={disabled}
        />

        <InputField
          label="Confirmar contraseña"
          type="password"
          name="confirmPassword"
          value={data.confirmPassword}
          onChange={handleChange}
          required
          autoComplete="new-password"
          placeholder="Repite tu contraseña"
          error={errors.confirmPassword}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
