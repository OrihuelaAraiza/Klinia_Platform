import { useState } from "react";
import Field from "../../UI/Field";
import Button from "../../UI/Button";
import ClinicalFieldRenderer from "./ClinicalFieldRenderer";
import { Plus, X } from "lucide-react";

/**
 * Extrae el mensaje de error de un objeto de error de React Hook Form.
 */
function extractErrorMessage(error) {
  if (!error) return undefined;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error.message) return error.message;
  if (Array.isArray(error)) return undefined;
  return undefined;
}

export default function ClinicalListField({
  field,
  value = [],
  onChange,
  error,
  readOnly,
  formData = {},
  context = {},
}) {
  const [localErrors, setLocalErrors] = useState({});
  // Aseguramos que el error sea un string, no un objeto
  const errorMessage = extractErrorMessage(error);

  const handleAdd = () => {
    const newItem = {};
    field.subfields?.forEach((subfield) => {
      newItem[subfield.id] = subfield.type === "number" ? null : "";
    });
    onChange(field.id, [...value, newItem]);
  };

  const handleRemove = (index) => {
    const newValue = value.filter((_, i) => i !== index);
    onChange(field.id, newValue);
  };

  const handleItemChange = (index, subfieldId, subValue) => {
    const newValue = [...value];
    if (!newValue[index]) {
      newValue[index] = {};
    }
    newValue[index][subfieldId] = subValue;
    onChange(field.id, newValue);
  };

  const validateItem = (item, index) => {
    const itemErrors = {};
    field.subfields?.forEach((subfield) => {
      if (subfield.required && !item[subfield.id]) {
        itemErrors[subfield.id] = `${subfield.label} es requerido`;
      }
    });
    if (Object.keys(itemErrors).length > 0) {
      setLocalErrors((prev) => ({ ...prev, [index]: itemErrors }));
      return false;
    }
    setLocalErrors((prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    }));
    return true;
  };

  return (
    <Field label={field.label} required={field.required} error={errorMessage} hint={field.helperText}>
      <div className="clinical-list-field">
        {value.length === 0 ? (
          <p className="helper-text" style={{ fontStyle: "italic" }}>
            {field.emptyMessage || "No hay elementos registrados"}
          </p>
        ) : (
          <div className="stack-3">
            {value.map((item, index) => (
              <div key={index} className="clinical-list-item" style={{ padding: "var(--s-4)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", background: "var(--surface-2)" }}>
                <div className="cluster" style={{ justifyContent: "space-between", marginBottom: "var(--s-3)" }}>
                  <strong style={{ fontSize: "0.95rem" }}>{field.itemLabel || `Elemento ${index + 1}`}</strong>
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(index)}
                      title="Eliminar"
                    >
                      <X size={16} />
                    </Button>
                  )}
                </div>
                <div className="stack-3">
                  {field.subfields?.map((subfield) => {
                    const shouldShow = !subfield.conditional || 
                      item[subfield.conditional.field] === subfield.conditional.value;
                    
                    if (!shouldShow) return null;

                    return (
                      <ClinicalFieldRenderer
                        key={subfield.id}
                        field={subfield}
                        value={item[subfield.id]}
                        onChange={(id, val) => handleItemChange(index, id, val)}
                        errors={localErrors[index] || {}}
                        readOnly={readOnly}
                        context={context}
                        formData={{ ...formData, ...item }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        {!readOnly && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAdd}
            style={{ marginTop: "var(--s-3)" }}
          >
            <Plus size={16} style={{ marginRight: "0.5rem" }} />
            {field.addLabel || "Agregar"}
          </Button>
        )}
      </div>
    </Field>
  );
}



