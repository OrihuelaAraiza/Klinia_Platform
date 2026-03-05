import { useMemo } from "react";
import InputField from "../InputField";
import Field from "../UI/Field"; // Asegúrate de tener acceso al componente Field para el select
import StepDocs from "./StepDocs";

export default function StepIdentity({
  data,
  errors,
  onChange,
  documents,
  documentErrors,
  onDocumentChange,
  onDocumentBusyChange,
  disabled = false,
}) {
  const today = useMemo(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    onChange?.(name, value);
  };

  return (
    <div className="register-step">
      <div className="register-step__header">
        <h2 className="register-step__title">Identidad</h2>
        <p className="register-step__subtitle">
          Necesitamos tus datos personales y especialidad para validar tu perfil profesional.
        </p>
      </div>

      <div className="register-step__body register-step__grid">
        {/* NUEVO CAMPO: ESPECIALIDAD */}
        <Field 
          label="Especialidad Profesional" 
          required 
          error={errors.specialty}
          style={{ gridColumn: "1 / -1" }} // Ocupa todo el ancho para destacar
        >
          <select
            name="specialty"
            value={data.specialty || ""}
            onChange={handleChange}
            disabled={disabled}
            className="role-select" 
          >
            <option value="">Selecciona tu especialidad</option>
            <option value="PSICOLOGO">Psicólogo</option>
            <option value="PSICOTERAPEUTA">Psicoterapeuta</option>
            <option value="PSIQUIATRA">Psiquiatra</option>
          </select>
        </Field>

        <InputField
          label="Nombres"
          name="firstName"
          value={data.firstName}
          onChange={handleChange}
          required
          placeholder="Nombre(s)"
          error={errors.firstName}
          disabled={disabled}
        />

        <InputField
          label="Apellidos"
          name="lastName"
          value={data.lastName}
          onChange={handleChange}
          required
          placeholder="Apellido(s)"
          error={errors.lastName}
          disabled={disabled}
        />

        <InputField
          label="CURP"
          name="curp"
          value={data.curp}
          onChange={handleChange}
          required
          placeholder="XXXX000000XXXXXX00"
          error={errors.curp}
          disabled={disabled}
          autoComplete="off"
        />

        <InputField
          label="Cédula profesional"
          name="certificateFolio" 
          value={data.certificateFolio} 
          onChange={handleChange}
          required
          placeholder="Número de cédula profesional"
          error={errors.certificateFolio} 
          disabled={disabled}
          autoComplete="off"
        />

        <InputField
          label="Fecha de nacimiento"
          type="date"
          name="birthDate"
          value={data.birthDate}
          onChange={handleChange}
          required
          error={errors.birthDate}
          disabled={disabled}
          max={today}
        />
      </div>

      <StepDocs
        embedded
        documents={documents}
        errors={documentErrors}
        onDocumentChange={onDocumentChange}
        onBusyChange={onDocumentBusyChange}
        disabled={disabled}
      />
    </div>
  );
}
