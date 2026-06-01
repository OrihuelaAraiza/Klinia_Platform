import AddressFields from "./AddressFields";

export default function StepAddressPAT({
  data,
  errors,
  onChange,
  disabled = false,
}) {
  return (
    <div className="register-step">
      <div className="register-step__header">
        <h2 className="register-step__title">Domicilio</h2>
        <p className="register-step__subtitle">
          Te ayudamos a llenar tu dirección a partir del código postal.
        </p>
      </div>

      <AddressFields
        data={data}
        errors={errors}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}
