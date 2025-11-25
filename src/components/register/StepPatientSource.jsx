import Field from "../UI/Field";

export default function StepPatientSource({ data, onChange, errors, disabled }) {
    
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange(name, value);
  };

  return (
    <div className="register-step">
      <div className="register-step__header">
        <h2 className="register-step__title">Motivo y Fuente</h2>
        <p className="register-step__subtitle">
          Ayúdanos a entender por qué elegiste Klinia y cómo nos encontraste.
        </p>
      </div>

      <div className="register-step__body register-step__grid">
        
        <Field label="¿Cómo nos encontró?" required error={errors.referral}>
          <select
            name="referral"
            value={data.referral || ""}
            onChange={handleChange}
            disabled={disabled}
            className="role-select" 
          >
            <option value="">Selecciona una opción</option>
            <option value="REDES_SOCIALES">Redes Sociales</option>
            <option value="BUSQUEDA_WEB">Búsqueda en Internet (Google/Bing)</option>
            <option value="RECOMENDACION">Recomendación (Familiar/Amigo)</option>
            <option value="ESPECIALISTA">Recomendación de un Especialista</option>
            <option value="OTRO">Otro / No Aplica</option>
          </select>
        </Field>

        <Field label="Motivo principal del registro" required hint="Ej: Agendar cita, buscar historial médico, etc." error={errors.purpose}>
          <textarea
            name="purpose"
            value={data.purpose || ""}
            onChange={handleChange}
            disabled={disabled}
            className="textarea" 
            placeholder="Quiero agendar una cita con el Doctor X..."
            rows={4}
          />
        </Field>
      </div>
    </div>
  );
}