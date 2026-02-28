/**
 * ClinicalFieldRenderer
 * Renderiza campos clínicos individuales basándose en la configuración del esquema.
 * Incluye protección contra el renderizado accidental de objetos JSON.
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

  /**
   * ESCUDO PROTECTOR (Anti-Crash):
   * Si el valor es un objeto (como {codigo, descripcion}), extraemos las propiedades
   * de texto. Esto evita el error "Objects are not valid as a React child".
   */
  const safeValue = useMemo(() => {
    if (value === null || value === undefined) return "";
    
    // Si es un objeto pero no es un Array (las listas las maneja ClinicalListField)
    if (typeof value === "object" && !Array.isArray(value)) {
      // Prioridad de llaves comunes en tus esquemas
      return (
        value.label || 
        value.descripcion || 
        value.medicamento || 
        value.nombre || 
        value.codigo ||
        Object.values(value).filter(v => typeof v !== 'object').join(" - ")
      );
    }
    return value;
  }, [value]);

  const shouldShow = useMemo(() => {
    if (!field.conditional) return true;

    const { field: conditionalField, value: conditionalValue, operator = "==" } = field.conditional;
    const currentValue = formData[conditionalField];

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

  // Manejo de campos Readonly y Computados (Edad, Nombre Paciente, etc.)
  if (field.type === "readonly" && field.computed) {
    let computedValue = field.computed(formData, context);

    if (field.options && computedValue) {
      const match = field.options.find(
        (opt) => opt.value === computedValue
      );
      computedValue = match?.label ?? computedValue;
    }

    // Aseguramos que el valor computado sea un string/número renderizable
    const finalComputed = typeof computedValue === "object" && computedValue !== null
      ? (computedValue.label || computedValue.descripcion || JSON.stringify(computedValue))
      : computedValue;

    return (
      <ClinicalReadonlyField
        field={field}
        value={finalComputed}
        error={fieldError}
      />
    );
  }

  // Renderizado según el tipo de campo definido en NOTE_SCHEMA
  switch (field.type) {
    case "text":
    case "number":
    case "date":
    case "datetime":
      return (
        <ClinicalTextField
          field={field}
          type={field.type === "datetime" ? "datetime-local" : field.type}
          value={safeValue} // Usamos el valor seguro
          onChange={onChange}
          error={fieldError}
          readOnly={isReadonly}
        />
      );

    case "textarea":
      return (
        <ClinicalTextareaField
          field={field}
          value={safeValue} // Usamos el valor seguro
          onChange={onChange}
          error={fieldError}
          readOnly={isReadonly}
        />
      );

    case "select":
    case "multiselect":
    case "radio":
    case "checkbox":
      return (
        <ClinicalSelectField
          field={field}
          value={value} // Los selectores suelen manejar sus propios objetos internamente
          onChange={onChange}
          error={fieldError}
          readOnly={isReadonly}
          multiple={field.type === "multiselect"}
          asRadio={field.type === "radio"}
          asCheckbox={field.type === "checkbox"}
        />
      );

    case "yesno":
      return (
        <ClinicalYesNoField
          field={field}
          value={value}
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
      return null;
  }
}