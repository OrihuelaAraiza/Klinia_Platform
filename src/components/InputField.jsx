import { forwardRef, useId } from "react";
import Field from "./UI/Field";

const InputField = forwardRef(function InputField(
  {
    label,
    type = "text",
    placeholder = "",
    value,
    onChange,
    name,
    required = false,
    autoComplete,
    onBlur,
    error,
    assistiveText,
    disabled = false,
    readOnly = false,
    children,
    ...inputProps
  },
  ref
) {
  const autoId = useId();
  const fieldId = `${name || "field"}-${autoId}`;

  return (
    <Field
      label={label}
      hint={assistiveText}
      error={error}
      name={name}
      id={fieldId}
      required={required}
    >
      {({ fieldId: controlId, describedBy }) => (
        children ? (
          children({ controlId, describedBy })
        ) : (
          <input
            ref={ref}
            id={controlId}
            name={name}
            type={type}
            className={`input-field__input${error ? " has-error" : ""}`}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            required={required}
            autoComplete={autoComplete}
            disabled={disabled}
            readOnly={readOnly}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            {...inputProps}
          />
        )
      )}
    </Field>
  );
});

export default InputField;
