import { useState, useEffect } from "react";
import InputField from "../InputField";

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

  // Efecto que dispara la búsqueda cuando el CP tiene 5 dígitos
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
      // Llamada a tu API de Azure a través de tu proxy local para evitar CORS
      const response = await fetch(`/api/utils/consulta-cp/${cp}`);
      
      if (!response.ok) throw new Error("Error en el servidor");

      const result = await response.json();

      // Mapeo según tu nueva estructura de API (result.estado, result.municipio, result.colonias)
      if (result && result.estado) {
        // Extraemos los nombres de las colonias del array de objetos
        const listaColonias = result.colonias?.map(c => c.nombre) || [];
        setColonias(listaColonias);

        // Actualizamos Ciudad (usando el campo municipio o ciudad de tu JSON) y Estado
        onChange?.("city", result.municipio || "");
        onChange?.("state", result.estado || "");

        // Si solo hay una colonia, la seleccionamos por defecto
        if (listaColonias.length === 1) {
          onChange?.("neighborhood", listaColonias[0]);
        }
      }
    } catch (error) {
      console.error("Error al consultar CP:", error);
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
          assistiveText={loadingPostal ? "Buscando ubicación..." : ""}
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
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}
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