import { useState, useEffect } from "react";
import InputField from "../InputField";
import { lookupPostalCode } from "../../utils/addressLookup";

export default function StepAddress({
  data,
  errors,
  onChange,
  disabled = false,
}) {
  const [colonias, setColonias] = useState([]);
  const [loadingPostal, setLoadingPostal] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    onChange?.(name, value);
  };

  useEffect(() => {
    if (data.postalCode && data.postalCode.length === 5) {
      searchPostalCode(data.postalCode);
    } else {
      setColonias([]);
    }
  }, [data.postalCode]);

  const searchPostalCode = async (cp) => {
    setLoadingPostal(true);
    try {
      const result = await lookupPostalCode(cp);
      if (!result) {
        setColonias([]);
        return;
      }

      setColonias(result.colonies || []);
      onChange?.("city", result.city || "");
      onChange?.("state", result.stateName || "");

      if ((result.colonies || []).length === 1) {
        onChange?.("neighborhood", result.colonies[0]);
      }
    } catch (error) {
      console.error("Error crítico al consultar CP:", error);
    } finally {
      setLoadingPostal(false);
    }
  };

  return (
    <div className="register-step">
      <div className="register-step__header">
        <h2 className="register-step__title">Domicilio</h2>
      </div>

      <div className="register-step__body register-step__grid">

        {/* Campo: Código Postal */}
        <InputField
          label="Código postal"
          name="postalCode"
          value={data.postalCode || ""}
          onChange={handleChange}
          required
          inputMode="numeric"
          placeholder="12345"
          error={errors.postalCode}
          disabled={disabled}
          assistiveText={loadingPostal ? "Localizando..." : ""}
        />

        {/* Campo: Colonia (Dropdown dinámico) */}
        <InputField
          label="Colonia"
          name="neighborhood"
          required
          error={errors.neighborhood}
          disabled={disabled || colonias.length === 0}
        >
          {({ controlId, describedBy }) => (
            <select
              id={controlId}
              name="neighborhood"
              value={data.neighborhood || ""}
              onChange={handleChange}
              className={`role-select${errors.neighborhood ? " has-error" : ""}`}
              style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border)' }}
              aria-invalid={Boolean(errors.neighborhood)}
              aria-describedby={describedBy}
              disabled={disabled || colonias.length === 0}
            >
              <option value="">
                {colonias.length > 0 ? "Selecciona colonia" : "Esperando CP..."}
              </option>
              {colonias.map((col, idx) => (
                <option key={`${col}-${idx}`} value={col}>
                  {col}
                </option>
              ))}
            </select>
          )}
        </InputField>

        {/* Campo: Ciudad (Auto-completado) */}
        <InputField
          label="Ciudad o municipio"
          name="city"
          value={data.city || ""}
          onChange={handleChange}
          required
          placeholder="Ciudad"
          error={errors.city}
          disabled={disabled}
          readOnly={colonias.length > 0} 
        />

        {/* Campo: Estado (Auto-completado) */}
        <InputField
          label="Estado"
          name="state"
          value={data.state || ""}
          onChange={handleChange}
          required
          placeholder="Estado"
          error={errors.state}
          disabled={disabled}
          readOnly={colonias.length > 0}
        />

        {/* Campo: Calle y número */}
        <InputField
          label="Calle y número"
          name="street"
          value={data.street || ""}
          onChange={handleChange}
          required
          placeholder="Calle, No. Ext e Int"
          error={errors.street}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
