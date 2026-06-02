import { Lock, ShieldCheck } from "lucide-react";
import Card, { CardHeader, CardBody } from "../UI/Card";
import Badge from "../UI/Badge";
import { HISTORY_LEGAL_NOTICE } from "../../config/clinicalSchemas/historiaClinica";
import { formatDateISOToHuman } from "../../utils/formatters";

/**
 * Vista de solo lectura schema-driven: mismo schema que el form, pero
 * renderiza los valores sin inputs editables.
 */
export default function HistoriaClinicaReadOnly({ schema, history }) {
  const flat = flatten(history, schema);
  const author = history?.professional?.name || "Profesional";
  const updated = history?.updatedAt
    ? formatDateISOToHuman(history.updatedAt)
    : "—";

  return (
    <div className="historia-readonly stack-3">
      <div className="historia-form__legal">
        <ShieldCheck size={16} aria-hidden="true" />
        <p>{HISTORY_LEGAL_NOTICE}</p>
      </div>

      <div className="cluster" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <p className="helper-text small">
          Última actualización: <strong>{updated}</strong> · {author}
        </p>
        <Badge variant="info">
          <Lock size={12} aria-hidden="true" /> Solo lectura
        </Badge>
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
            <div className="historia-readonly__grid">
              {section.fields.map((field) => {
                const value = flat[field.key];
                const display = formatValue(field, value);
                const detalle =
                  field.type === "select" ? flat[`${field.key}__detalle`] : null;
                return (
                  <div
                    key={field.key}
                    className={`historia-readonly__field ${field.cols === 2 ? "span-2" : ""}`}
                  >
                    <span className="historia-readonly__label">{field.label}</span>
                    <p className="historia-readonly__value">
                      {display || (
                        <em className="helper-text">Sin información registrada.</em>
                      )}
                    </p>
                    {detalle && String(detalle).trim() ? (
                      <p className="historia-readonly__detalle">
                        <strong>Descripción: </strong>
                        {detalle}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

function formatValue(field, raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  if (field.type === "select" && Array.isArray(field.options)) {
    const found = field.options.find((o) => o.value === raw);
    return found?.label || String(raw);
  }
  if (field.type === "date") {
    return formatDateISOToHuman(raw);
  }
  if (field.type === "scale") {
    const max = field.max ?? 10;
    return `${raw} / ${max}`;
  }
  return String(raw);
}

function flatten(record, schema) {
  if (!record) return {};
  const flat = { ...record };
  if (record.extraFields && typeof record.extraFields === "object") {
    Object.assign(flat, record.extraFields);
  }
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
