import { useId, isValidElement, cloneElement } from "react";

function cx(...values) {
  return values
    .flatMap((value) => {
      if (!value) return [];
      if (typeof value === "string") return value.split(" ");
      if (Array.isArray(value)) return value;
      return Object.entries(value)
        .filter(([, truthy]) => Boolean(truthy))
        .map(([key]) => key);
    })
    .filter(Boolean)
    .join(" ");
}

/**
 * Función de utilidad para asegurar que el contenido a renderizar 
 * sea un string, un número o un elemento React válido.
 */
function ensureSafeContent(content) {
  if (content === null || content === undefined || typeof content === "boolean") {
    return null;
  }

  // Si es un elemento de React (JSX) o un string/número, es seguro
  if (isValidElement(content) || typeof content === "string" || typeof content === "number") {
    return content;
  }

  // Si es un objeto (el culpable del crash), extraemos texto de forma segura
  if (typeof content === "object") {
    // Caso especial: si es un error de validación con mensaje
    if (content.message) return String(content.message);
    
    // Si es un objeto de datos (Diagnóstico/Medicamento)
    return (
      content.descripcion || 
      content.label || 
      content.medicamento || 
      content.codigo || 
      // Si no hay llaves conocidas, unimos sus valores omitiendo otros objetos
      Object.values(content)
        .filter(v => typeof v !== 'object')
        .join(" - ") || 
      "Dato inválido"
    );
  }

  return String(content);
}

export default function Field({
  label,
  hint,
  error,
  name,
  id,
  required,
  children,
  className = "",
  assistiveText,
}) {
  const autoId = useId();
  const fieldId = id || `${name || "field"}-${autoId}`;
  const messageId = `${fieldId}-message`;

  // Limpiamos los contenidos potencialmente peligrosos
  const safeError = ensureSafeContent(error);
  const safeHint = ensureSafeContent(hint || assistiveText);

  const control =
    typeof children === "function"
      ? children({ fieldId, messageId, describedBy: safeError || safeHint ? messageId : undefined })
      : children;

  return (
    <div className={cx("ui-field", className)}>
      {label ? (
        <label className="ui-field__label" htmlFor={fieldId}>
          {label}
          {required ? <span className="ui-field__required">*</span> : null}
        </label>
      ) : null}
      
      <div className="ui-field__control">
        {control}
      </div>

      {/* Renderizado de Mensajes con protección total */}
      {safeHint && !safeError ? (
        <p id={messageId} className="ui-field__hint">
          {safeHint}
        </p>
      ) : null}
      
      {safeError ? (
        <p id={messageId} className="ui-field__error" role="alert">
          {safeError}
        </p>
      ) : null}
    </div>
  );
}