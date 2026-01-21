/**
 * ClinicalFieldRenderer
 * Renders individual clinical form fields based on schema configuration
 */

import { useMemo } from "react";
import InputField from "../../InputField";
import Field from "../../UI/Field";
import ClinicalTextField from "./ClinicalTextField";
import ClinicalTextareaField from "./ClinicalTextareaField";
import ClinicalSelectField from "./ClinicalSelectField";
import ClinicalYesNoField from "./ClinicalYesNoField";
import ClinicalReadonlyField from "./ClinicalReadonlyField";
import ClinicalListField from "./ClinicalListField";
import ClinicalFileField from "./ClinicalFileField";

/**
 * Extrae el mensaje de error de un objeto de error de React Hook Form.
 * Maneja tanto strings simples como objetos con propiedad `message`.
 */
function extractErrorMessage(error) {
  if (!error) return undefined;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error.message) return error.message;
  // Para errores de arrays/listas, no mostramos el error en el nivel superior
  if (Array.isArray(error)) return undefined;
  return undefined;
}

export default function ClinicalFieldRenderer({
  field,
  value,
  onChange,
  errors = {},
  readOnly = false,
  context = {},
  formData = {},
}) {
  const rawError = errors[field.id];
  const fieldError = extractErrorMessage(rawError);
  const isReadonly = readOnly || field.type === "readonly";
  const shouldShow = useMemo(() => {
    if (!field.conditional) return true;
    const conditionalField = field.conditional.field;
    const conditionalValue = field.conditional.value;
    const currentValue = formData[conditionalField];
    return currentValue === conditionalValue;
  }, [field.conditional, formData]);

  if (!shouldShow) return null;

  if (field.type === "readonly" && field.computed) {
    let computedValue = field.computed(formData, context);

    if (field.options && computedValue) {
      const match = field.options.find(
        (opt) => opt.value === computedValue
      );
      computedValue = match?.label ?? computedValue;
    }

    return (
      <ClinicalReadonlyField
        field={field}
        value={computedValue}
        error={fieldError}
      />
    );
  }

  // Render based on field type
  switch (field.type) {
    case "text":
      return (
        <ClinicalTextField
          field={field}
          value={value || ""}
          onChange={onChange}
          error={fieldError}
          readOnly={isReadonly}
        />
      );

    case "textarea":
      return (
        <ClinicalTextareaField
          field={field}
          value={value || ""}
          onChange={onChange}
          error={fieldError}
          readOnly={isReadonly}
        />
      );

    case "number":
      return (
        <ClinicalTextField
          field={field}
          type="number"
          value={value || ""}
          onChange={onChange}
          error={fieldError}
          readOnly={isReadonly}
        />
      );

    case "date":
      return (
        <ClinicalTextField
          field={field}
          type="date"
          value={value || ""}
          onChange={onChange}
          error={fieldError}
          readOnly={isReadonly}
        />
      );

    case "datetime":
      return (
        <ClinicalTextField
          field={field}
          type="datetime-local"
          value={value || ""}
          onChange={onChange}
          error={fieldError}
          readOnly={isReadonly}
        />
      );

    case "select":
      return (
        <ClinicalSelectField
          field={field}
          value={value || ""}
          onChange={onChange}
          error={fieldError}
          readOnly={isReadonly}
        />
      );

    case "multiselect":
      return (
        <ClinicalSelectField
          field={field}
          value={value || []}
          onChange={onChange}
          error={fieldError}
          readOnly={isReadonly}
          multiple
        />
      );

    case "radio":
      return (
        <ClinicalSelectField
          field={field}
          value={value || ""}
          onChange={onChange}
          error={fieldError}
          readOnly={isReadonly}
          asRadio
        />
      );

    case "checkbox":
      return (
        <ClinicalSelectField
          field={field}
          value={value || false}
          onChange={onChange}
          error={fieldError}
          readOnly={isReadonly}
          asCheckbox
        />
      );

    case "yesno":
      return (
        <ClinicalYesNoField
          field={field}
          value={value || ""}
          onChange={onChange}
          error={fieldError}
          readOnly={isReadonly}
        />
      );

    case "list":
      return (
        <ClinicalListField
          field={field}
          value={value || []}
          onChange={onChange}
          error={fieldError}
          readOnly={isReadonly}
          formData={formData}
          context={context}
        />
      );

    case "file":
      return (
        <ClinicalFileField
          field={field}
          value={value || []}
          onChange={onChange}
          error={fieldError}
          readOnly={isReadonly}
        />
      );

    default:
      console.warn(`Unknown field type: ${field.type} for field ${field.id}`);
      return null;
  }
}



