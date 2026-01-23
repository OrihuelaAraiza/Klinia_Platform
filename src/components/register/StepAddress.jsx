import { useState, useEffect } from "react";
import InputField from "../InputField";
import { lookupPostalCode, findStateValue } from "../../utils/addressLookup";
import { MEXICAN_STATES } from "../../utils/constants";


export default function StepAddress({
  data,
  errors,
  onChange,
  disabled = false,
}) {
  const [colonies, setColonies] = useState([]);
  const [loadingCP, setLoadingCP] = useState(false);

  useEffect(() => {
    const cp = data.postalCode;
    if (cp?.length === 5) {
      handleCPLookup(cp);
    } else {
      setColonies([]);
      if (data.neighborhood) onChange?.("neighborhood", "");
    }
  }, [data.postalCode]);

  const handleCPLookup = async (cp) => {
    setLoadingCP(true);
    try {
      const addressData = await lookupPostalCode(cp);

      if (addressData) {
        setColonies(addressData.colonies);
        
        onChange?.("city", addressData.city); 
        
        const stateValue = findStateValue(MEXICAN_STATES, addressData.stateName);
        if (stateValue) {
            onChange?.("state", stateValue);
        }
    }
    } catch (error) {
      console.error("Error al recuperar datos de dirección:", error);
    } finally {
      setLoadingCP(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    // Validación de entrada numérica para CP
    if (name === "postalCode") {
      const onlyNums = value.replace(/[^0-9]/g, "");
      onChange?.(name, onlyNums);
      return;
    }

    onChange?.(name, value);
  };

  return (
    <div className="register-step">
      <div className="register-step__header">
        <h2 className="register-step__title">Domicilio</h2>
        <p className="register-step__subtitle">
          Localización automática de estado y municipio mediante Código Postal.
        </p>
      </div>

      <div className="register-step__body register-step__grid">
        {/* CÓDIGO POSTAL */}
        <InputField
          label="Código postal"
          name="postalCode"
          value={data.postalCode}
          onChange={handleChange}
          required
          inputMode="numeric"
          maxLength={5}
          placeholder={loadingCP ? "Buscando..." : "12345"}
          error={errors.postalCode}
          disabled={disabled || loadingCP}
          autoComplete="postal-code"
        />

        {/* ESTADO */}
        <InputField
          label="Estado"
          name="state"
          required
          error={errors.state}
          disabled={disabled || loadingCP}
        >
          {({ controlId, describedBy }) => (
            <select
              id={controlId}
              name="state"
              value={data.state}
              onChange={handleChange}
              className={`role-select${errors.state ? " has-error" : ""}`}
              disabled={disabled || loadingCP}
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

        {/* CIUDAD / MUNICIPIO */}
        <InputField
          label="Ciudad o municipio"
          name="city"
          value={data.city}
          onChange={handleChange}
          required
          placeholder="Ej. Iztapalapa"
          error={errors.city}
          disabled={disabled || loadingCP}
        />

        {/* COLONIA - Aquí estaba el problema visual */}
        <InputField
  label="Colonia"
  name="neighborhood"
  required
  error={errors.neighborhood}
  disabled={disabled || (colonies.length === 0 && !loadingCP)}
>
  {({ controlId, describedBy }) => (
    <select
      id={controlId}
      name="neighborhood"
      value={data.neighborhood}
      onChange={handleChange}
      className={`role-select${errors.neighborhood ? " has-error" : ""}`}
      disabled={disabled || (colonies.length === 0 && !loadingCP)}
    >
      <option value="">
        {loadingCP 
          ? "Buscando colonias..." 
          : colonies.length > 0 
            ? "Selecciona una colonia" 
            : "Ingresa un CP válido"}
      </option>
      {/* CAMBIO AQUÍ: 'col' ahora es un string, no un objeto */}
      {colonies.map((colName, idx) => (
        <option 
          key={`${colName}-${idx}`} 
          value={colName}
        >
          {colName}
        </option>
      ))}
    </select>
  )}
</InputField>

        {/* CALLE Y NÚMERO */}
        <div className="register-step__full-width">
          <InputField
            label="Calle y número"
            name="street"
            value={data.street}
            onChange={handleChange}
            required
            placeholder="Av. Principal 456"
            error={errors.street}
            disabled={disabled}
            autoComplete="address-line1"
          />
        </div>
      </div>
    </div>
  );
}