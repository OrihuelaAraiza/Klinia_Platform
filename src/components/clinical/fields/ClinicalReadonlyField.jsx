import Field from "../../UI/Field";

export default function ClinicalReadonlyField({ field, value, error }) {
  // Función para convertir objetos en texto legible
  const formatSafeValue = (val) => {
    if (val === null || val === undefined || val === "") return "—";
    
    // Si es un objeto, extraemos sus campos de texto
    if (typeof val === "object" && !Array.isArray(val)) {
      return (
        val.descripcion || 
        val.medicamento || 
        val.label || 
        val.codigo || 
        Object.values(val).filter(v => typeof v !== 'object').join(" - ")
      );
    }
    
    return String(val);
  };

  return (
    <Field label={field.label} error={error} hint={field.helperText}>
      <div className="readonly-field" style={{ padding: "0.75rem", background: "var(--surface-2)", borderRadius: "var(--r-sm)", color: "var(--text)" }}>
        {/* ✅ Aquí usamos la función de formateo para que React no reciba un objeto */}
        <p style={{ margin: 0 }}>{formatSafeValue(value)}</p>
      </div>
    </Field>
  );
}