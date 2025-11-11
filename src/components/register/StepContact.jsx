import React, { useState } from 'react'; 
import InputField from "../InputField";
import { PhoneVerificationModal } from './PhoneVerificationModal'; 
import Field from "../UI/Field";

export default function StepContact({
  data,
  errors,
  onChange, 
  disabled = false,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isVerified = data.phoneIsVerified;

const handleChange = (event) => {
    const { name, value } = event.target;
    
    onChange?.({ [name]: value }); 

    if (name === 'phone' && isVerified) {
      onChange?.({ phoneIsVerified: false });
    }
  };

  const handleVerificationSuccess = () => {
    onChange?.({ phoneIsVerified: true }); 
    setIsModalOpen(false);
  };


  return (
    <div className="register-step">
      <div className="register-step__header">
      </div>

      <div className="register-step__body register-step__grid">
        
        <Field
          label="Telefono movil"
          required
          error={errors.phone}
          className="phone-verify-field" 
        >
          <div className="phone-verify-input"> 
            <input
              name="phone"
              value={data.phone || ''} 
              onChange={handleChange}
              inputMode="tel"
              pattern="\d{10}"
              placeholder="5512345678"
              disabled={disabled || isVerified} 
              autoComplete="tel-national"
              maxLength={10}
            />
            
            {isVerified ? (
              <span className="phone-verified-badge">✓ Verificado</span>
            ) : (
              <button 
                type="button" 
                onClick={() => setIsModalOpen(true)} 
                disabled={disabled || (data.phone || '').length !== 10}
                className="button-ghost" 
              >
                Verificar
              </button>
            )}
          </div>
        </Field>


        <InputField
          label="Contacto de emergencia"
          name="emergencyName"
          value={data.emergencyName || ''} // <-- Añade || ''
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
          value={data.emergencyPhone || ''} // <-- Añade || ''
          onChange={handleChange}
          required
          inputMode="tel"
          pattern="\d{10}"
          placeholder="5512345678"
          error={errors.emergencyPhone}
          disabled={disabled}
          autoComplete="off"
        />
      </div>

      {/* --- MODAL AÑADIDO --- */}
      {/* El modal solo se renderiza si isModalOpen es true */}
      {isModalOpen && (
        <PhoneVerificationModal
          phone={data.phone}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleVerificationSuccess}
        />
      )}
      {/* ------------------- */}
    </div>
  );
}