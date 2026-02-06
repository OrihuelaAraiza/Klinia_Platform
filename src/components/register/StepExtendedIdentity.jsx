import InputField from "../InputField";
import Field from "../UI/Field";
import { useMemo } from "react";

export default function StepExtendedIdentity({
  data,
  errors,
  onChange,
  disabled = false,
}) {
  const handleChange = (event) => {
    const { name, value } = event.target;
    onChange?.(name, value);
  };

  // Lógica para determinar si es menor de edad (Opcional para validación visual)
  const isMinor = useMemo(() => {
    if (!data.birthDate) return false;
    const birth = new Date(data.birthDate);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age < 18;
  }, [data.birthDate]);

  return (
    <div className="register-step">
      <div className="register-step__header">
        <h2 className="register-step__title">Información Adicional y Contacto</h2>
        <p className="register-step__subtitle">
          Datos complementarios para el expediente clínico y contacto legal.
        </p>
      </div>

      <div className="register-step__body register-step__grid">
        {/* RFC - Opcional */}
        <InputField
          label="RFC"
          name="rfc"
          value={data.rfc}
          onChange={handleChange}
          placeholder="XXXX000000XXX"
          error={errors.rfc}
          disabled={disabled}
        />

        {/* Teléfonos adicionales - Opcionales */}
        <InputField
          label="Teléfono de Casa"
          name="homePhone"
          value={data.homePhone}
          onChange={handleChange}
          placeholder="55 0000 0000"
          error={errors.homePhone}
          disabled={disabled}
        />

        <InputField
          label="Teléfono del Trabajo"
          name="workPhone"
          value={data.workPhone}
          onChange={handleChange}
          placeholder="55 0000 0000 ext 000"
          error={errors.workPhone}
          disabled={disabled}
        />

        {/* Contacto de Emergencia: Parentesco (El nombre y tel ya los tienes en otro lado) */}
        <InputField
          label="Parentesco Contacto Emergencia"
          name="emergencyRelation"
          value={data.emergencyRelation}
          onChange={handleChange}
          placeholder="Ej. Madre, Esposo, Amigo"
          error={errors.emergencyRelation}
          disabled={disabled}
        />

        {/* SECCIÓN RESPONSABLE LEGAL - Condicional o Informativa */}
        <div className="register-step__full-width divider">
            <hr />
            <h3 className="section-subtitle">Responsable Legal {isMinor && <span className="tag-required">(Requerido por Minoría de Edad)</span>}</h3>
        </div>

        <InputField
          label="Nombre del Responsable"
          name="legalGuardianName"
          value={data.legalGuardianName}
          onChange={handleChange}
          required={isMinor}
          placeholder="Nombre completo"
          error={errors.legalGuardianName}
          disabled={disabled}
        />

        <InputField
          label="Parentesco Responsable"
          name="legalGuardianRelation"
          value={data.legalGuardianRelation}
          onChange={handleChange}
          required={isMinor}
          placeholder="Ej. Padre, Tutor legal"
          error={errors.legalGuardianRelation}
          disabled={disabled}
        />

        <InputField
          label="Teléfono Responsable"
          name="legalGuardianPhone"
          value={data.legalGuardianPhone}
          onChange={handleChange}
          required={isMinor}
          placeholder="10 dígitos"
          error={errors.legalGuardianPhone}
          disabled={disabled}
        />
      </div>
    </div>
  );
}