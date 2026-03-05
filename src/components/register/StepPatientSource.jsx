import { useState, useEffect } from "react";
import Field from "../UI/Field";
import { getProfessionalsList } from "../../services/patientsService";

export default function StepPatientSource({ data, onChange, errors, disabled }) {
  const [professionals, setProfessionals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchTerapists() {
      setIsLoading(true);
      try {
        const list = await getProfessionalsList();
        
        // Filtramos para omitir a los Psiquiatras
        // Si no tiene especialidad (null), lo dejamos pasar para que tome el default abajo
        const filtered = (list || []).filter(
          (pro) => pro.specialty !== "PSIQUIATRA"
        );
        
        setProfessionals(filtered);
      } catch (err) {
        console.error("No se pudieron cargar los terapeutas");
      } finally {
        setIsLoading(false);
      }
    }
    fetchTerapists();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange(name, value);
  };

  /**
   * Nueva lógica de formateo:
   * Si no hay especialidad, retorna "Psicoterapeuta"
   * Si existe, la pone en minúsculas con la primera en mayúscula
   */
  const formatSpecialty = (s) => {
    if (!s) return "Psicoterapeuta";
    
    // Diccionario para que los valores de base de datos se vean bien
    const labels = {
      "PSICOLOGO": "Psicólogo",
      "PSICOTERAPEUTA": "Psicoterapeuta",
      "PSIQUIATRA": "Psiquiatra"
    };

    return labels[s] || s.charAt(0) + s.slice(1).toLowerCase();
  };

  return (
    <div className="register-step">
      <div className="register-step__header">
        <h2 className="register-step__title">Asignación y Motivo</h2>
        <p className="register-step__subtitle">
          Selecciona al especialista que te atenderá y cuéntanos cómo nos encontraste.
        </p>
      </div>

      <div className="register-step__body register-step__grid">
        
        <Field 
            label="Selecciona tu terapeuta" 
            required 
            error={errors.professionalInChargeId}
            hint={isLoading ? "Cargando especialistas..." : ""}
        >
          <select
            name="professionalInChargeId"
            value={data.professionalInChargeId || ""}
            onChange={handleChange}
            disabled={disabled || isLoading}
            className="role-select" 
          >
            <option value="">-- Elige un profesional --</option>
            {professionals.map((pro) => (
              <option key={pro.id} value={pro.id}>
                {/* Aquí aplicamos el default: pro.specialty || "PSICOTERAPEUTA" no es necesario 
                    porque la función formatSpecialty ya lo maneja */}
                {pro.name} — ({formatSpecialty(pro.specialty)})
              </option>
            ))}
          </select>
        </Field>

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
            <option value="BUSQUEDA_WEB">Búsqueda en Internet</option>
            <option value="RECOMENDACION">Recomendación</option>
            <option value="ESPECIALISTA">Especialista Externo</option>
          </select>
        </Field>

        <Field 
            label="Motivo principal" 
            required 
            error={errors.purpose}
            style={{ gridColumn: "1 / -1" }}
        >
          <textarea
            name="purpose"
            value={data.purpose || ""}
            onChange={handleChange}
            disabled={disabled}
            className="textarea" 
            placeholder="Breve descripción del motivo de tu consulta..."
            rows={3}
          />
        </Field>
      </div>
    </div>
  );
}