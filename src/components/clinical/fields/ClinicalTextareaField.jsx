import Field from "../../UI/Field";

export default function ClinicalTextareaField({
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
    <Field
      label={field.label}
      required={field.required}
      error={error}
      hint={field.helperText}
    >
      {({ fieldId, describedBy }) => (
        <textarea
          id={fieldId}
          name={field.id}
          className="textarea"
          rows={field.rows || 4}
          value={value}
          onChange={handleChange}
          placeholder={field.placeholder}
          readOnly={readOnly}
          disabled={readOnly}
          required={field.required}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
        />
      )}
    </Field>
  );
}



