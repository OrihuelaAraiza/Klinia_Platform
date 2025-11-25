import { useMemo } from "react";
import InputField from "../InputField";
import Field from "../UI/Field";

export default function StepIdentity({
  data,
  errors,
  onChange,
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
          Necesitamos tus datos personales para validar tu identidad.
        </p>
      </div>

      <div className="register-step__body register-step__grid">
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

        <Field label="Género" error={errors.gender}>
            <select 
                name="gender" 
                value={data.gender || ''} 
                onChange={handleChange} 
                disabled={disabled} 
                className="role-select" // Reutilizamos el estilo select
                required
            >
                <option value="">Selecciona una opción</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="NB">No Binario</option>
            </select>
        </Field>
        
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
    </div>
  );
}
