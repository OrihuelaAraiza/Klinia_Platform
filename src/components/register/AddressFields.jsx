import { useState, useEffect, useRef } from "react";
import { CheckCircle2, MapPin, AlertCircle } from "lucide-react";
import InputField from "../InputField";
import { lookupPostalCode } from "../../utils/addressLookup";

/**
 * Bloque de domicilio reutilizable para los flujos de registro (paciente y
 * profesional). Cuando el usuario teclea un CP de 5 dígitos, consulta la API
 * Romi-SEPOMEX y autollena estado, municipio y la lista de colonias.
 *
 * Campos manejados:
 *   - postalCode, neighborhood, city, state, street
 *   - opcional: officeName (solo en flujo profesional)
 */
export default function AddressFields({
  data,
  errors = {},
  onChange,
  disabled = false,
  includeOfficeName = false,
  officeFieldLabel = "Nombre del consultorio / Clínica",
  officeFieldPlaceholder = "Ej. Centro Médico Especializado",
}) {
  const [colonias, setColonias] = useState([]);
  const [loadingPostal, setLoadingPostal] = useState(false);
  const [lookupStatus, setLookupStatus] = useState("idle"); // idle | found | not-found | error
  const lastCpRef = useRef("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    onChange?.(name, value);
  };

  useEffect(() => {
    const cp = data.postalCode || "";
    // Evita re-fetch si el CP ya quedó "limpio" (5 dígitos) y no cambió
    if (cp.length === 5 && cp !== lastCpRef.current) {
      lastCpRef.current = cp;
      searchPostalCode(cp);
    } else if (cp.length < 5) {
      setColonias([]);
      setLookupStatus("idle");
      lastCpRef.current = "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.postalCode]);

  const searchPostalCode = async (cp) => {
    setLoadingPostal(true);
    setLookupStatus("idle");
    try {
      const result = await lookupPostalCode(cp);
      if (!result) {
        setColonias([]);
        setLookupStatus("not-found");
        return;
      }
      setColonias(result.colonies || []);
      onChange?.("city", result.city || "");
      onChange?.("state", result.stateName || "");
      if ((result.colonies || []).length === 1) {
        onChange?.("neighborhood", result.colonies[0]);
      }
      setLookupStatus("found");
    } catch (error) {
      console.error("Error al consultar CP:", error);
      setLookupStatus("error");
    } finally {
      setLoadingPostal(false);
    }
  };

  // Feedback debajo del CP
  let cpHint = null;
  if (loadingPostal) {
    cpHint = "Buscando ubicación…";
  } else if (lookupStatus === "found") {
    cpHint = `${colonias.length} colonia${colonias.length === 1 ? "" : "s"} encontrada${colonias.length === 1 ? "" : "s"}.`;
  } else if (lookupStatus === "not-found") {
    cpHint = "No encontramos ese CP. Verifica o llena los campos manualmente.";
  } else if (lookupStatus === "error") {
    cpHint = "Servicio de CP no disponible. Llena los campos manualmente.";
  }

  return (
    <div className="register-step__body register-step__grid address-fields">
      {includeOfficeName ? (
        <div style={{ gridColumn: "1 / -1" }}>
          <InputField
            label={officeFieldLabel}
            name="officeName"
            value={data.officeName || ""}
            onChange={handleChange}
            required
            placeholder={officeFieldPlaceholder}
            error={errors.officeName}
            disabled={disabled}
          />
        </div>
      ) : null}

      <InputField
        label="Código postal"
        name="postalCode"
        value={data.postalCode || ""}
        onChange={handleChange}
        required
        inputMode="numeric"
        maxLength={5}
        placeholder="12345"
        error={errors.postalCode}
        disabled={disabled}
        assistiveText={cpHint}
      />

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
            className={`input-field__input address-fields__select${errors.neighborhood ? " has-error" : ""}`}
            aria-invalid={Boolean(errors.neighborhood)}
            aria-describedby={describedBy}
            disabled={disabled || colonias.length === 0}
          >
            <option value="">
              {colonias.length > 0
                ? "Selecciona colonia"
                : data.postalCode?.length === 5 && lookupStatus !== "idle"
                  ? "Sin colonias disponibles"
                  : "Esperando CP…"}
            </option>
            {colonias.map((col, idx) => (
              <option key={`${col}-${idx}`} value={col}>
                {col}
              </option>
            ))}
          </select>
        )}
      </InputField>

      <InputField
        label="Ciudad o municipio"
        name="city"
        value={data.city || ""}
        onChange={handleChange}
        required
        placeholder="Ciudad"
        error={errors.city}
        disabled={disabled}
        readOnly={lookupStatus === "found"}
      />

      <InputField
        label="Estado"
        name="state"
        value={data.state || ""}
        onChange={handleChange}
        required
        placeholder="Estado"
        error={errors.state}
        disabled={disabled}
        readOnly={lookupStatus === "found"}
      />

      <div style={{ gridColumn: "1 / -1" }}>
        <InputField
          label="Calle y número"
          name="street"
          value={data.street || ""}
          onChange={handleChange}
          required
          placeholder="Calle, No. Ext. e Int."
          error={errors.street}
          disabled={disabled}
        />
      </div>

      {/* Pista de UX — sólo cuando aún no se ha intentado */}
      {lookupStatus === "idle" && !loadingPostal ? (
        <div className="address-fields__hint" style={{ gridColumn: "1 / -1" }}>
          <MapPin size={14} aria-hidden="true" />
          <span>Escribe tu código postal y autollenamos estado, ciudad y colonias.</span>
        </div>
      ) : null}
      {lookupStatus === "found" ? (
        <div className="address-fields__hint address-fields__hint--ok" style={{ gridColumn: "1 / -1" }}>
          <CheckCircle2 size={14} aria-hidden="true" />
          <span>Ubicación detectada en {data.city}, {data.state}.</span>
        </div>
      ) : null}
      {lookupStatus === "not-found" ? (
        <div className="address-fields__hint address-fields__hint--warn" style={{ gridColumn: "1 / -1" }}>
          <AlertCircle size={14} aria-hidden="true" />
          <span>No encontramos ese CP. Puedes llenar los campos manualmente.</span>
        </div>
      ) : null}
    </div>
  );
}
