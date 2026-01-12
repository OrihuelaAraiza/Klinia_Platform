import InputField from "../InputField";
import { MEXICAN_STATES } from "../../utils/constants";

export default function StepAddress({
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
        <h2 className="register-step__title">Domicilio</h2>
        <p className="register-step__subtitle">
          Confirma el domicilio asociado a tus credenciales profesionales.
        </p>
      </div>

      <div className="register-step__body register-step__grid">
        <InputField
          label="Calle y numero"
          name="street"
          value={data.street}
          onChange={handleChange}
          required
          placeholder="Av. Salud 123"
          error={errors.street}
          disabled={disabled}
          autoComplete="address-line1"
        />

        <InputField
          label="Colonia"
          name="neighborhood"
          value={data.neighborhood}
          onChange={handleChange}
          required
          placeholder="Residencial Esperanza"
          error={errors.neighborhood}
          disabled={disabled}
          autoComplete="address-line2"
        />

        <InputField
          label="Codigo postal"
          name="postalCode"
          value={data.postalCode}
          onChange={handleChange}
          required
          inputMode="numeric"
          pattern="\\d{5}"
          placeholder="12345"
          error={errors.postalCode}
          disabled={disabled}
          autoComplete="postal-code"
        />

        <InputField
          label="Ciudad o municipio"
          name="city"
          value={data.city}
          onChange={handleChange}
          required
          placeholder="Ciudad"
          error={errors.city}
          disabled={disabled}
          autoComplete="address-level2"
        />

        <InputField
          label="Estado"
          name="state"
          required
          error={errors.state}
          disabled={disabled}
        >
          {({ controlId, describedBy }) => (
            <select
              id={controlId}
              name="state"
              value={data.state}
              onChange={handleChange}
              className={`role-select${errors.state ? " has-error" : ""}`}
              aria-invalid={Boolean(errors.state)}
              aria-describedby={describedBy}
              disabled={disabled}
            >
              <option value="">Selecciona un estado</option>
              {MEXICAN_STATES.map((state) => (
                <option key={state.value} value={state.value}>
                  {state.label}
                </option>
              ))}
            </select>
          )}
        </InputField>
      </div>
    </div>
  );
}
