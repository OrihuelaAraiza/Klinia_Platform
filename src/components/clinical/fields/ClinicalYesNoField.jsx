import Field from "../../UI/Field";

const YES_NO_OPTIONS = [
  { value: "true", label: "Sí" },
  { value: "false", label: "No" },
];

export default function ClinicalYesNoField({
  field,
  value,
  onChange,
  error,
  readOnly,
}) {
  const handleChange = (e) => {
  const boolValue = e.target.value === "true";
  onChange(field.id, boolValue);
};

  return (
    <Field
      label={field.label}
      required={field.required}
      error={error}
      hint={field.helperText}
    >
      <div className="cluster" style={{ flexWrap: "wrap", gap: "var(--s-3)" }}>
        {YES_NO_OPTIONS.map((option) => (
          <label
            key={String(option.value)}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <input
              type="radio"
              name={field.id}
              value={option.value}
              checked={ option.value === "true" ? value === true : value !== true }
              onChange={handleChange}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </Field>
  );
}
