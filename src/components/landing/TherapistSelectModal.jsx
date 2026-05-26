import { useNavigate } from "react-router-dom";
import { LogIn, UserPlus } from "lucide-react";
import Modal from "../UI/Modal";
import Button from "../UI/Button";
import { SPECIALTY_LABELS } from "../../utils/constants";

/**
 * Aparece cuando el visitante eligió un terapeuta desde la landing.
 * Le pregunta si ya tiene cuenta para enviarlo a Login o a registro paciente.
 * En ambos casos la selección sigue persistida en sessionStorage.
 */
export default function TherapistSelectModal({ open, onClose, therapist, role }) {
  const navigate = useNavigate();
  if (!therapist) return null;

  const goLogin = () => {
    onClose?.();
    navigate("/login");
  };
  const goRegister = () => {
    onClose?.();
    navigate("/register/patient");
  };

  const isBackup = role === "backup";
  const title = isBackup
    ? `Confirmamos tu 2ª opción: ${therapist.name}`
    : `Vincularte con ${therapist.name}`;
  const specialty = SPECIALTY_LABELS[therapist.specialty] || therapist.specialty || "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="cluster gap-2" style={{ width: "100%", justifyContent: "flex-end", flexWrap: "wrap" }}>
          <Button variant="ghost" onClick={onClose}>Seguir explorando</Button>
          <Button variant="secondary" onClick={goLogin}>
            <LogIn size={16} aria-hidden="true" style={{ marginRight: 6 }} />
            Ya tengo cuenta
          </Button>
          <Button variant="primary" onClick={goRegister}>
            <UserPlus size={16} aria-hidden="true" style={{ marginRight: 6 }} />
            Crear cuenta nueva
          </Button>
        </div>
      }
    >
      <div className="stack-3">
        <p>
          {isBackup ? (
            <>Registramos a <strong>{therapist.name}</strong>{specialty ? <> ({specialty})</> : null} como tu segunda opción en caso de que tu primer terapeuta no tenga disponibilidad.</>
          ) : (
            <>Elegiste a <strong>{therapist.name}</strong>{specialty ? <> ({specialty})</> : null}. Para enviar tu solicitud de vinculación necesitas una cuenta.</>
          )}
        </p>
        <p className="helper-text">
          Tu selección permanece guardada mientras te registras o inicias sesión.
        </p>
      </div>
    </Modal>
  );
}
