import { useState } from "react";
import Field from "../../UI/Field";
import Button from "../../UI/Button";
import ClinicalFieldRenderer from "./ClinicalFieldRenderer";
import { Plus, X } from "lucide-react";

export default function ClinicalListField({
  field,
  value = [],
  onChange,
  error,
  readOnly,
  formData = {},
  context = {},
}) {
  const [localErrors] = useState({});

  // Función auxiliar para convertir objetos a texto seguro
  const getSafeText = (val) => {
    if (val === null || val === undefined || val === "") return "";
    if (Array.isArray(val)) {
      if (val.length === 0) return "";
      return val
        .map((entry) => {
          if (typeof entry === "object" && entry !== null) {
            return entry.name || entry.filename || entry.label || entry.id || "";
          }
          return String(entry);
        })
        .filter(Boolean)
        .join(", ");
    }
    if (typeof val === "object" && !Array.isArray(val)) {
      return (
        val.descripcion || 
        val.label || 
        val.medicamento || 
        val.nombre || 
        val.codigo || 
        Object.values(val).filter(v => typeof v !== 'object').join(" — ")
      );
    }
    return String(val);
  };

  const handleAdd = () => {
    const newItem = {};
    field.subfields?.forEach((subfield) => {
      if (subfield.type === "number") {
        newItem[subfield.id] = null;
      } else if (subfield.type === "file") {
        newItem[subfield.id] = [];
      } else {
        newItem[subfield.id] = "";
      }
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

  const resolveFileUrl = (file) => (
    file?.blobUrl ||
    file?.url ||
    file?.fileUrl ||
    file?.downloadUrl ||
    file?.path ||
    ""
  );

  // --- MODO LECTURA ---
  if (readOnly) {
    return (
      <Field label={field.label} hint={field.helperText}>
        <div className="stack-2">
          {(!value || value.length === 0) ? (
            <p className="helper-text italic">{field.emptyMessage || "Sin registros"}</p>
          ) : (
            <div className="stack-2">
              {value.map((item, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    padding: "var(--s-3)", 
                    borderLeft: "4px solid var(--color-primary-500)", 
                    background: "var(--surface-2)",
                    borderRadius: "var(--r-sm)",
                    fontSize: "0.95rem"
                  }}
                >
                  {field.subfields?.map((sub) => {
                    if (sub.type === "file") {
                      const files = Array.isArray(item[sub.id]) ? item[sub.id] : [];
                      if (files.length === 0) return null;

                      return (
                        <div key={sub.id} style={{ marginBottom: "8px" }}>
                          <div
                            style={{
                              fontWeight: "600",
                              color: "var(--color-neutral-800)",
                              marginBottom: "4px",
                            }}
                          >
                            {sub.label}:
                          </div>
                          <div className="cluster" style={{ gap: "var(--s-2)", flexWrap: "wrap" }}>
                            {files.map((file, fileIndex) => {
                              const fileName = file?.name || `Archivo ${fileIndex + 1}`;
                              const fileUrl = resolveFileUrl(file);

                              if (!fileUrl) {
                                return (
                                  <span key={`${sub.id}-${file?.id || fileIndex}`} className="helper-text">
                                    {fileName}
                                  </span>
                                );
                              }

                              return (
                                <a
                                  key={`${sub.id}-${file?.id || fileIndex}`}
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="link"
                                >
                                  Ver archivo: {fileName}
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    const textValue = getSafeText(item[sub.id]);
                    if (!textValue) return null;

                    return (
                      <div key={sub.id} style={{ marginBottom: "4px" }}>
                        <span style={{ fontWeight: "600", color: "var(--color-neutral-800)" }}>
                          {sub.label}:
                        </span>{" "}
                        <span style={{ color: "var(--color-neutral-700)" }}>
                          {textValue}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </Field>
    );
  }

  // --- MODO EDICIÓN ---
  return (
    <Field label={field.label} required={field.required} error={error} hint={field.helperText}>
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(index)}
                    title="Eliminar"
                  >
                    <X size={16} />
                  </Button>
                </div>
                <div className="stack-3">
                  {field.subfields?.map((subfield) => {
                    const shouldShow = !subfield.conditional || 
                      item[subfield.conditional.field] === subfield.conditional.value;
                    
                    if (!shouldShow) return null;

                    // Si estamos editando un campo de texto pero el valor es un objeto,
                    // lo extraemos como texto para que el INPUT no explote.
                    const isTextType = ["text", "textarea"].includes(subfield.type);
                    const currentValue = item[subfield.id];
                    const safeValueForInput = isTextType ? getSafeText(currentValue) : currentValue;

                    return (
                      <ClinicalFieldRenderer
                        key={subfield.id}
                        field={subfield}
                        value={safeValueForInput || ""}
                        onChange={(id, val) => handleItemChange(index, id, val)}
                        errors={localErrors[index] || {}}
                        readOnly={false} 
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
      </div>
    </Field>
  );
}
