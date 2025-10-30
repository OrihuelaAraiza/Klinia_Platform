import { useId } from "react";

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

export default function Field({
  label,
  hint,
  error,
  name,
  id,
  required,
  children,
  className = "",
}) {
  const autoId = useId();
  const fieldId = id || `${name || "field"}-${autoId}`;
  const messageId = `${fieldId}-message`;

  const control =
    typeof children === "function"
      ? children({ fieldId, messageId, describedBy: error || hint ? messageId : undefined })
      : children;

  return (
    <div className={cx("ui-field", className)}>
      {label ? (
        <label className="ui-field__label" htmlFor={fieldId}>
          {label}
          {required ? <span className="ui-field__required">*</span> : null}
        </label>
      ) : null}
      {control}
      {hint && !error ? (
        <p id={messageId} className="ui-field__hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={messageId} className="ui-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
