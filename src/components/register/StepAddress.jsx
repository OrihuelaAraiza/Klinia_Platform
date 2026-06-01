import AddressFields from "./AddressFields";

export default function StepAddress({
  data,
  errors,
  onChange,
  disabled = false,
}) {
  return (
    <div className="register-step">
      <div className="register-step__header">
        <h2 className="register-step__title">Domicilio profesional</h2>
        <p className="register-step__subtitle">
          Ingresa el código postal para localizar la ubicación de tu consultorio.
        </p>
      </div>

      <AddressFields
        data={data}
        errors={errors}
        onChange={onChange}
        disabled={disabled}
        includeOfficeName
      />
    </div>
  );
}
