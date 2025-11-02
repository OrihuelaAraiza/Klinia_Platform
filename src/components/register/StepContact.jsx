import InputField from "../InputField";

export default function StepContact({
  data,
  errors,
  onChange,
  disabled = false,
}) {
  const handleChange = (event) => {
    const { name, value } = event.target;
    onChange?.(name, value);
  };

  return (
    <div className="register-step">
      <div className="register-step__header">
        <h2 className="register-step__title">Contacto</h2>
        <p className="register-step__subtitle">
          Manten tus datos de contacto actualizados para notificaciones.
        </p>
      </div>

      <div className="register-step__body register-step__grid">
        <InputField
          label="Telefono movil"
          name="phone"
          value={data.phone}
          onChange={handleChange}
          required
          inputMode="tel"
          pattern="\\d{10}"
          placeholder="5512345678"
          error={errors.phone}
          disabled={disabled}
          autoComplete="tel-national"
        />

        <InputField
          label="Contacto de emergencia"
          name="emergencyName"
          value={data.emergencyName}
          onChange={handleChange}
          required
          placeholder="Nombre completo"
          error={errors.emergencyName}
          disabled={disabled}
          autoComplete="off"
        />

        <InputField
          label="Telefono de emergencia"
          name="emergencyPhone"
          value={data.emergencyPhone}
          onChange={handleChange}
          required
          inputMode="tel"
          pattern="\\d{10}"
          placeholder="5512345678"
          error={errors.emergencyPhone}
          disabled={disabled}
          autoComplete="off"
        />
      </div>
    </div>
  );
}
