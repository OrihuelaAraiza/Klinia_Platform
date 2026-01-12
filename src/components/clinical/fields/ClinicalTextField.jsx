import InputField from "../../InputField";

export default function ClinicalTextField({
  field,
  value,
  onChange,
  error,
  readOnly,
  type = "text",
}) {
  const handleChange = (e) => {
    const newValue = type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value;
    onChange(field.id, newValue);
  };

  return (
    <InputField
      label={field.label}
      name={field.id}
      type={type}
      value={value}
      onChange={handleChange}
      placeholder={field.placeholder}
      required={field.required}
      error={error}
      readOnly={readOnly}
      assistiveText={field.helperText}
    />
  );
}



