import React, { useState, useEffect, useRef} from 'react';
import verificationService from '../../services/verificationService'; 
import Field from "../UI/Field";
import Button from "../UI/Button";

export function PhoneVerificationModal({ phone, onClose, onSuccess }) {
  const [otpCode, setOtpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Enviando código...");


  const hasSent = useRef(false);

  useEffect(() => {
    if (hasSent.current === false) {
      hasSent.current = true;
    
      const sendOtp = async () => {
        setIsLoading(true);
        setError("");
        try {
          await verificationService.sendPhoneOtp(phone);
          setStatus(`Te enviamos un código al +52 ${phone}`);
        } catch (err) {
          setError(err.message || "Error al enviar el código. Intenta de nuevo.");
        }
        setIsLoading(false);
      };
      sendOtp();
    }
    
  }, [phone]);

const handleCheckOtp = async (e) => {
    e.preventDefault(); 
    setIsLoading(true);
    setError("");

    try {
      const response = await verificationService.checkPhoneOtp(phone, otpCode);
      console.log('Respuesta del backend (checkPhoneOtp):', response);
      if (response && response.status === 'approved') {
        onSuccess();
      } else {
        setError("Código incorrecto. Intenta de nuevo."); 
      }
    } catch (err) { 
      setError(err.message || "Código incorrecto o expirado.");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="camera-modal-backdrop" onClick={onClose}>
      <div className="camera-modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Verificar Teléfono</h3>
        <p>{status}</p>
        
        <form onSubmit={handleCheckOtp}>
          <Field label="Código de 6 dígitos" error={error}>
            <input
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              disabled={isLoading}
              maxLength={6}
               className="input-field__input" 
            />
          </Field>
          
          <div className="camera-modal-actions">
            <Button type="submit" disabled={isLoading || otpCode.length < 6} variant="primary">
              {isLoading ? "Verificando..." : "Confirmar Código"}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
