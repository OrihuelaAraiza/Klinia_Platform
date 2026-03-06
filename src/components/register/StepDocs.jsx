import { useEffect } from "react";

export default function StepDocs({ onBusyChange, embedded = false }) {
  useEffect(() => {
    onBusyChange?.(false);
  }, [onBusyChange]);

  return (
    <div className={embedded ? "register-step__embedded stack-3" : "register-step"}>
      {embedded ? (
        <div className="register-step__header">
          <h3 className="register-step__title">Documentación</h3>
          <p className="register-step__subtitle">
            La carga de INE/Pasaporte y archivo de cédula profesional está temporalmente deshabilitada.
          </p>
        </div>
      ) : (
        <div className="register-step__header">
          <h2 className="register-step__title">Documentación</h2>
          <p className="register-step__subtitle">
            La carga de INE/Pasaporte y archivo de cédula profesional está temporalmente deshabilitada.
          </p>
        </div>
      )}
    </div>
  );
}
