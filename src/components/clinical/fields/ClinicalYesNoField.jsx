import Field from "../../UI/Field";

const YES_NO_OPTIONS = [
  { value: "SI", label: "Sí" },
  { value: "NO", label: "No" },
];

export default function ClinicalYesNoField({
  field,
  value,
  onChange,
  error,
  readOnly,
}) {
  const handleChange = (e) => {
    onChange(field.id, e.target.value);
  };

  return (
    <Field label={field.label} required={field.required} error={error} hint={field.helperText}>
      <div className="cluster" style={{ flexWrap: "wrap", gap: "var(--s-3)" }}>
        {YES_NO_OPTIONS.map((option) => (
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

