import { useEffect, useState } from "react";
import { ShieldCheck, FileWarning } from "lucide-react";
import Card, { CardHeader, CardBody } from "../UI/Card";
import Button from "../UI/Button";
import InputField from "../InputField";
import { useToast } from "../UI/Toast";
import { saveClinicalHistory } from "../../services/clinicalHistoryService";
import { HISTORY_LEGAL_NOTICE } from "../../config/clinicalSchemas/historiaClinica";

/**
 * Renderer dinámico de Historia Clínica.
 * Lee un schema (sections + fields) y produce un formulario completo con
 * autosave y vista limpia. No usa el wizard antiguo (que estaba acoplado a TBE).
 *
 * Props:
 *   schema     — { type, title, subtitle, sections: [{ id, title, hint?, fields: [...] }] }
 *   initial    — objeto plano con los valores guardados (mezcla columnas + extraFields)
 *   patientId  — para el POST de save
 *   disabled   — si es true, no permite edición
 *   onSaved    — callback con la entidad guardada
 */
export default function HistoriaClinicaForm({
  schema,
  initial,
  patientId,
  disabled = false,
  onSaved,
}) {
  const toast = useToast();
  const [form, setForm] = useState(() => flatten(initial, schema));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(flatten(initial, schema));
  }, [initial, schema]);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!patientId) {
      toast.error("Falta patientId — no se puede guardar.");
      return;
    }
    setSaving(true);
    try {
      // Marcamos el tipo para que el backend persista esa columna.
      const payload = { type: schema.type, ...form };
      const saved = await saveClinicalHistory(patientId, payload);
      onSaved?.(saved);
      toast.success("Historia clínica guardada");
    } catch (err) {
      toast.error(err?.message || "No se pudo guardar la historia clínica.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="historia-form stack-3" onSubmit={handleSave}>
      <div className="historia-form__legal">
        <ShieldCheck size={16} aria-hidden="true" />
        <p>{HISTORY_LEGAL_NOTICE}</p>
      </div>

      {schema.sections.map((section, idx) => (
        <Card key={section.id} hoverable={false}>
          <CardHeader className="cluster" style={{ alignItems: "flex-start", gap: "0.6rem" }}>
            <span className="historia-form__seq" aria-hidden="true">
              {idx + 1}
            </span>
            <div>
              <h3>{section.title}</h3>
              {section.hint ? <p className="helper-text">{section.hint}</p> : null}
            </div>
          </CardHeader>
          <CardBody>
            <div className="historia-form__grid">
              {section.fields.map((field) => (
                <FormField
                  key={field.key}
                  field={field}
                  value={form[field.key] ?? ""}
                  detalle={form[`${field.key}__detalle`] ?? ""}
                  onChange={(v) => setField(field.key, v)}
                  onDetalleChange={(v) => setField(`${field.key}__detalle`, v)}
                  disabled={disabled}
                />
              ))}
            </div>
          </CardBody>
        </Card>
      ))}

      {!disabled ? (
        <div className="cluster" style={{ justifyContent: "flex-end", gap: "0.6rem" }}>
          <Button type="submit" variant="primary" loading={saving}>
            Guardar historia clínica
          </Button>
        </div>
      ) : (
        <div className="historia-form__readonly-banner">
          <FileWarning size={14} /> Esta historia es de solo lectura para tu rol.
        </div>
      )}
    </form>
  );
}

function FormField({ field, value, detalle, onChange, onDetalleChange, disabled }) {
  const span = field.cols === 2 ? "span-2" : "";

  if (field.type === "textarea") {
    return (
      <div className={`historia-form__field ${span}`}>
        <InputField
          label={field.label}
          name={field.key}
          required={field.required}
          assistiveText={field.hint}
          disabled={disabled}
        >
          {({ controlId, describedBy }) => (
            <textarea
              id={controlId}
              name={field.key}
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              rows={field.rows || 3}
              placeholder={field.placeholder}
              disabled={disabled}
              aria-describedby={describedBy}
              className="input-field__input"
            />
          )}
        </InputField>
      </div>
    );
  }

  if (field.type === "scale") {
    const num = value === "" || value === null || value === undefined ? 0 : Number(value);
    const max = field.max ?? 10;
    return (
      <div className={`historia-form__field ${span}`}>
        <InputField
          label={field.label}
          name={field.key}
          required={field.required}
          assistiveText={field.hint}
          disabled={disabled}
        >
          {({ controlId, describedBy }) => (
            <div className="historia-form__scale">
              <input
                id={controlId}
                type="range"
                min={field.min ?? 0}
                max={max}
                step={field.step ?? 1}
                value={num}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                aria-describedby={describedBy}
                className="historia-form__scale-range"
              />
              <span className="historia-form__scale-value" aria-live="polite">{num}</span>
            </div>
          )}
        </InputField>
      </div>
    );
  }

  if (field.type === "select") {
    const hasValue = Boolean(value && value !== "");
    const showDetalle = hasValue && field.detalle !== false && !disabled;
    return (
      <div className={`historia-form__field ${span}`}>
        <InputField
          label={field.label}
          name={field.key}
          required={field.required}
          disabled={disabled}
        >
          {({ controlId, describedBy }) => (
            <select
              id={controlId}
              name={field.key}
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              aria-describedby={describedBy}
              className="address-fields__select"
            >
              {field.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        </InputField>
        {showDetalle ? (
          <div className="historia-form__detalle">
            <label className="historia-form__detalle-label" htmlFor={`${field.key}__detalle`}>
              Descripción <span className="helper-text">(opcional)</span>
            </label>
            <textarea
              id={`${field.key}__detalle`}
              name={`${field.key}__detalle`}
              value={detalle || ""}
              onChange={(e) => onDetalleChange?.(e.target.value)}
              rows={2}
              placeholder="Detalle, observaciones o justificación del valor seleccionado…"
              className="input-field__input"
            />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`historia-form__field ${span}`}>
      <InputField
        label={field.label}
        name={field.key}
        type={field.type || "text"}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
        placeholder={field.placeholder}
        assistiveText={field.hint}
        disabled={disabled}
      />
    </div>
  );
}

/**
 * Aplana el objeto guardado (columnas + extraFields) a un objeto flat que el
 * formulario puede usar directamente con field.key.
 */
function flatten(record, schema) {
  if (!record) return {};
  const flat = { ...record };
  // extraFields es Json del backend: mezclar al nivel principal
  if (record.extraFields && typeof record.extraFields === "object") {
    Object.assign(flat, record.extraFields);
  }
  // Conserva las llaves del schema + la llave de detalle de cada select.
  const allowed = new Set();
  for (const section of schema.sections) {
    for (const f of section.fields) {
      allowed.add(f.key);
      if (f.type === "select" && f.detalle !== false) {
        allowed.add(`${f.key}__detalle`);
      }
    }
  }
  const out = {};
  for (const k of allowed) out[k] = flat[k] ?? "";
  return out;
}
