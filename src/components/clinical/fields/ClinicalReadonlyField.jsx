import Field from "../../UI/Field";

export default function ClinicalReadonlyField({ field, value, error }) {
  return (
    <Field label={field.label} error={error} hint={field.helperText}>
      <div className="readonly-field" style={{ padding: "0.75rem", background: "var(--surface-2)", borderRadius: "var(--r-sm)", color: "var(--text)" }}>
        {value || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>—</span>}
      </div>
    </Field>
  );
}

