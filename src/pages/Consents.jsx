import { useOutletContext } from "react-router-dom";
import { CONSENT_TYPES, ROLES } from "../utils/constants";

const CONSENTS = [
  {
    type: CONSENT_TYPES.ATTENTION,
    label: "Consentimiento de atención",
    description:
      "Autoriza la prestación de servicios psicoterapéuticos bajo modalidad presencial o remota.",
    status: "signed",
    signedAt: "2024-05-02T10:24:00",
    professional: "Dra. Sofía Méndez",
  },
  {
    type: CONSENT_TYPES.RECORDING,
    label: "Grabación y transcripción",
    description:
      "Permite grabar sesiones para fines clínicos y la elaboración de notas.",
    status: "pending",
    signedAt: null,
    professional: "",
  },
  {
    type: CONSENT_TYPES.AI_USE,
    label: "Uso de IA asistida",
    description:
      "Autoriza el procesamiento de datos con algoritmos supervisados, conservando anonimato.",
    status: "signed",
    signedAt: "2024-04-15T09:00:00",
    professional: "Dra. Sofía Méndez",
  },
];

const STATUS_LABELS = {
  signed: "Firmado",
  pending: "Pendiente",
  revoked: "Revocado",
};

export default function Consents() {
  const { role } = useOutletContext() ?? {};

  return (
    <section className="page">
      <header className="page__header">
        <h1>Consentimientos</h1>
        <p>
          Controla la documentación requerida para cumplir con la NOM-004 y la
          Ley Federal de Protección de Datos.
        </p>
      </header>

      <div className="consent-list">
        {CONSENTS.map((consent) => {
          const isSigned = consent.status === "signed";
          return (
            <article key={consent.type} className="consent-card">
              <label className="consent-card__body">
                <input
                  type="checkbox"
                  checked={isSigned}
                  readOnly
                  aria-label={consent.label}
                />
                <div>
                  <h2 className="consent-card__title">{consent.label}</h2>
                  <p className="consent-card__description">{consent.description}</p>
                  <p className="consent-card__status">
                    Estado: <strong>{STATUS_LABELS[consent.status]}</strong>
                  </p>
                  {consent.signedAt ? (
                    <p className="consent-card__meta">
                      Firmado el {" "}
                      {new Date(consent.signedAt).toLocaleString("es-MX", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      {consent.professional ? ` por ${consent.professional}` : ""}
                    </p>
                  ) : (
                    <p className="consent-card__meta">
                      En espera de firma. Comparte con el paciente para continuar.
                    </p>
                  )}
                </div>
              </label>
              {role ? (
                <p className="consent-card__hint">
                  {role === ROLES.ASSISTANT
                    ? "Solo lectura: el asistente puede verificar estados y enviar recordatorios."
                    : "Accede al módulo de firma digital para actualizar este consentimiento."}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
