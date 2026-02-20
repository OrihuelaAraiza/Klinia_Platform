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

export default function ClinicalFieldRenderer({
  field,
  value,
  onChange,
  errors = {},
  readOnly = false,
  context = {},
  formData = {},
}) {
  const fieldError = errors[field.id];
  const isReadonly = readOnly || field.type === "readonly";
  const shouldShow = useMemo(() => {
    if (!field.conditional) return true;

    const { field: conditionalField, value: conditionalValue, operator = "==" } = field.conditional;
    const currentValue = formData[conditionalField];

    // Normaliza el valor actual a string para comparar con el schema
    const normalize = (val) => {
      if (typeof val === "boolean") return val ? "SI" : "NO";
      if (typeof val === "string") return val.toUpperCase().trim();
      return val;
    };

    const normalizedCurrent = normalize(currentValue);
    const normalizedExpected = normalize(conditionalValue);

    if (operator === "!=") {
      return normalizedCurrent !== "" &&
        normalizedCurrent !== undefined &&
        normalizedCurrent !== normalizedExpected;
    }

    return normalizedCurrent === normalizedExpected;
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



