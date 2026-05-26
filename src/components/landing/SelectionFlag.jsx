import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserCheck, X, ArrowRight } from "lucide-react";
import selectionStorage from "../../services/selectionStorage";
import { SPECIALTY_LABELS } from "../../utils/constants";

/**
 * Bandera persistente que muestra el o los terapeutas que el visitante eligió
 * desde la landing. Se monta en páginas públicas (Home, Login, Register…) y se
 * sincroniza vía evento global `therapist-selection-change`.
 *
 * Si no hay selección, no renderiza nada (no ocupa espacio).
 */
export default function SelectionFlag({ ctaLabel = "Continuar al registro", ctaTo = "/register/patient" }) {
  const navigate = useNavigate();
  const [selection, setSelection] = useState(() => selectionStorage.getSelection());

  useEffect(() => {
    const handler = () => setSelection(selectionStorage.getSelection());
    window.addEventListener("therapist-selection-change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("therapist-selection-change", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const { primary, backup } = selection;
  if (!primary && !backup) return null;

  const specialtyLabel = (s) => SPECIALTY_LABELS[s] || s || "";

  return (
    <div className="selection-flag" role="status" aria-live="polite">
      <div className="selection-flag__inner">
        <div className="selection-flag__icon" aria-hidden="true">
          <UserCheck size={18} />
        </div>
        <div className="selection-flag__content">
          <span className="selection-flag__label">Tu selección:</span>
          <div className="selection-flag__chips">
            {primary ? (
              <span className="selection-flag__chip selection-flag__chip--primary">
                <strong>{primary.name}</strong>
                {primary.specialty ? <span> · {specialtyLabel(primary.specialty)}</span> : null}
                <button
                  type="button"
                  className="selection-flag__remove"
                  aria-label={`Quitar ${primary.name}`}
                  onClick={() => selectionStorage.clearPrimary()}
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </span>
            ) : null}
            {backup ? (
              <span className="selection-flag__chip selection-flag__chip--backup">
                <span className="selection-flag__chip-tag">2ª opción</span>
                <strong>{backup.name}</strong>
                {backup.specialty ? <span> · {specialtyLabel(backup.specialty)}</span> : null}
                <button
                  type="button"
                  className="selection-flag__remove"
                  aria-label={`Quitar ${backup.name}`}
                  onClick={() => selectionStorage.clearBackup()}
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </span>
            ) : null}
          </div>
        </div>
        <div className="selection-flag__actions">
          <button
            type="button"
            className="selection-flag__link"
            onClick={() => navigate("/")}
          >
            Cambiar
          </button>
          {primary ? (
            <button
              type="button"
              className="selection-flag__cta"
              onClick={() => navigate(ctaTo)}
            >
              {ctaLabel}
              <ArrowRight size={14} aria-hidden="true" style={{ marginLeft: 4 }} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
