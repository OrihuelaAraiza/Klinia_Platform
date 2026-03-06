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

  // Detectar la URL base (usar proxy en local, URL absoluta en servidor si es necesario)
  const API_BASE = import.meta.env.VITE_API_URL || "";

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
      // Usamos API_BASE para asegurar la ruta correcta en el servidor
      const response = await fetch(`${API_BASE}/api/utils/consulta-cp/${cp}`);
      
      // PROTECCIÓN: Validar que la respuesta sea JSON
      const contentType = response.headers.get("content-type");
      if (!response.ok || !contentType || !contentType.includes("application/json")) {
        const errorMsg = await response.text();
        console.error("El servidor no devolvió JSON válido. Respuesta:", errorMsg.substring(0, 100));
        return;
      }

      const result = await response.json();

      // Mapeo según la estructura confirmada (result.estado, result.municipio, result.colonias)
      if (result && result.estado) {
        // Normalizar lista de colonias (maneja si es array de strings o de objetos)
        const lista = result.colonias?.map(c => typeof c === 'string' ? c : c.nombre) || [];
        setColonias(lista);

        // Actualizamos Ciudad y Estado
        onChange?.("city", result.municipio || result.ciudad || "");
        onChange?.("state", result.estado || "");

        // Auto-selección si solo hay una opción
        if (lista.length === 1) {
          onChange?.("neighborhood", lista[0]);
        }
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