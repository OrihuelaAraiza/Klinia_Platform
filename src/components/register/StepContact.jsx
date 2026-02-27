import React, { useState } from 'react'; 
import InputField from "../InputField";
import { PhoneVerificationModal } from './PhoneVerificationModal'; 
import Field from "../UI/Field";
import Button from "../UI/Button";

export default function StepContact({
  data,
  errors,
  onChange, 
  disabled = false,
}) {
  const [verificationTarget, setVerificationTarget] = useState(null); 
  
  const isPhoneVerified = data.phoneIsVerified;
  const isEmergencyVerified = data.emergencyPhoneIsVerified; 

  const handleChange = (event) => {
    const { name, value } = event.target;
    
    onChange?.({ [name]: value }); 

    if (name === 'phone' && isPhoneVerified) {
      onChange?.({ phoneIsVerified: false });
    }
    if (name === 'emergencyPhone' && isEmergencyVerified) {
      onChange?.({ emergencyPhoneIsVerified: false });
    }
  };

  const handleOpenModal = (target) => {
    setVerificationTarget(target);
  };

  const handleVerificationSuccess = () => {
    if (verificationTarget === 'phone') {
      onChange?.({ phoneIsVerified: true });
    } else if (verificationTarget === 'emergencyPhone') {
      onChange?.({ emergencyPhoneIsVerified: true });
    }
    setVerificationTarget(null);
  };

  return (
    <div className="register-step">
      <div className="register-step__header">
        <h2 className="register-step__title">Contacto</h2>
        <p className="register-step__subtitle">Verifica los números de contacto para garantizar la seguridad del servicio.</p>
      </div>

      <div className="register-step__body register-step__grid">
        
        {/* TELÉFONO PRINCIPAL */}
        <Field label="Teléfono móvil" required error={errors.phone}>
          <div className="phone-verify-input"> 
            <input
              name="phone"
              value={data.phone || ''} 
              onChange={handleChange}
              inputMode="tel"
              placeholder="5512345678"
              disabled={disabled || isPhoneVerified} 
              className="input-field__input" 
              maxLength={10}
            />
            {isPhoneVerified ? (
              <span className="phone-verified-badge">✓ Verificado</span>
            ) : (
              <Button 
                type="button" 
                onClick={() => handleOpenModal('phone')} 
                disabled={disabled || (data.phone || '').length !== 10}
                variant="primary"
              >
                Verificar
              </Button>
            )}
          </div>
        </Field>

        <InputField
          label="Contacto de emergencia"
          name="emergencyName"
          value={data.emergencyName || ""}
          onChange={handleChange}
          placeholder="Nombre completo"
          error={errors.emergencyName}
          disabled={disabled}
        />

        {/* TELÉFONO DE EMERGENCIA (Ahora con verificación) */}
        <Field label="Teléfono de emergencia" error={errors.emergencyPhone}>
          <div className="phone-verify-input"> 
            <input
              name="emergencyPhone"
              value={data.emergencyPhone || ''} 
              onChange={handleChange}
              inputMode="tel"
              placeholder="5512345678"
              disabled={disabled || isEmergencyVerified} 
              className="input-field__input"
              maxLength={10}
            />
            {isEmergencyVerified ? (
              <span className="phone-verified-badge">✓ Verificado</span>
            ) : (
              <Button 
                type="button" 
                onClick={() => handleOpenModal('emergencyPhone')} 
                disabled={disabled || (data.emergencyPhone || '').length !== 10}
                variant="primary"
              >
                Verificar
              </Button>
            )}
          </div>
        </Field>
      </div>

      {/* MODAL DINÁMICO */}
      {verificationTarget && (
        <PhoneVerificationModal
          phone={verificationTarget === 'phone' ? data.phone : data.emergencyPhone}
          onClose={() => setVerificationTarget(null)}
          onSuccess={handleVerificationSuccess}
        />
      )}
    </div>
  );
}
