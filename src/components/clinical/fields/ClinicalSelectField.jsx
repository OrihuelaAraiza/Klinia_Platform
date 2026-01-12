import Field from "../../UI/Field";

export default function ClinicalSelectField({
  field,
  value,
  onChange,
  error,
  readOnly,
  multiple = false,
  asRadio = false,
  asCheckbox = false,
}) {
  const handleChange = (e) => {
    if (multiple) {
      const selected = Array.from(e.target.selectedOptions, (option) => option.value);
      onChange(field.id, selected);
    } else if (asCheckbox) {
      onChange(field.id, e.target.checked);
    } else {
      onChange(field.id, e.target.value);
    }
  };

  if (asRadio) {
    return (
      <Field label={field.label} required={field.required} error={error} hint={field.helperText}>
        <div className="cluster" style={{ flexWrap: "wrap", gap: "var(--s-3)" }}>
          {field.options?.map((option) => (
            <label key={option.value} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="radio"
                name={field.id}
                value={option.value}
                checked={value === option.value}
                onChange={handleChange}
                disabled={readOnly}
                required={field.required}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </Field>
    );
  }

  if (asCheckbox) {
    return (
      <Field label={field.label} required={field.required} error={error} hint={field.helperText}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            name={field.id}
            checked={value || false}
            onChange={handleChange}
            disabled={readOnly}
            required={field.required}
          />
          <span>{field.checkboxLabel || field.label}</span>
        </label>
      </Field>
    );
  }

  return (
    <Field label={field.label} required={field.required} error={error} hint={field.helperText}>
      {({ fieldId, describedBy }) => (
        <select
          id={fieldId}
          name={field.id}
          className="role-select"
          value={multiple ? undefined : value || ""}
          onChange={handleChange}
          disabled={readOnly}
          required={field.required}
          multiple={multiple}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
        >
          {!field.required && !multiple && <option value="">Selecciona una opción</option>}
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}



