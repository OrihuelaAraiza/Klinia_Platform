import { MapPin, Globe, Briefcase } from "lucide-react";
import Badge from "../UI/Badge";
import { SPECIALTY_LABELS } from "../../utils/constants";

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .filter(Boolean)
    .join("") || "T";
}

function modalityLabel(modality) {
  if (modality === "VIRTUAL") return "Virtual";
  if (modality === "PRESENCIAL") return "Presencial";
  if (modality === "MIXTA") return "Presencial y virtual";
  return modality || "Por confirmar";
}

export default function TherapistCard({
  therapist,
  selectedAs,        // 'primary' | 'backup' | null
  primarySelected,   // boolean — habilita el botón "2ª opción"
  onSelectPrimary,
  onSelectBackup,
}) {
  if (!therapist) return null;
  const specialtyLabel = SPECIALTY_LABELS[therapist.specialty] || therapist.specialty || "Profesional";
  const initials = getInitials(therapist.name);
  const isPrimary = selectedAs === "primary";
  const isBackup = selectedAs === "backup";

  return (
    <article className={`therapist-card${isPrimary ? " is-primary" : ""}${isBackup ? " is-backup" : ""}`}>
      <header className="therapist-card__header">
        <div className="therapist-card__avatar" aria-hidden="true">
          {initials}
        </div>
        <div className="therapist-card__id">
          <h3 className="therapist-card__name">{therapist.name}</h3>
          <div className="cluster gap-1 wrap">
            <Badge variant="info">{specialtyLabel}</Badge>
            {therapist.yearsExperience ? (
              <Badge variant="neutral">{therapist.yearsExperience} años</Badge>
            ) : null}
          </div>
        </div>
      </header>

      {therapist.bio ? (
        <p className="therapist-card__bio">{therapist.bio}</p>
      ) : null}

      <ul className="therapist-card__meta">
        {(therapist.city || therapist.state) ? (
          <li>
            <MapPin size={14} aria-hidden="true" />
            <span>
              {[therapist.city, therapist.state].filter(Boolean).join(", ")}
              {" · "}
              {modalityLabel(therapist.modality)}
            </span>
          </li>
        ) : null}
        {therapist.languages?.length ? (
          <li>
            <Globe size={14} aria-hidden="true" />
            <span>{therapist.languages.join(" · ")}</span>
          </li>
        ) : null}
        {therapist.focusAreas?.length ? (
          <li>
            <Briefcase size={14} aria-hidden="true" />
            <div className="therapist-card__chips">
              {therapist.focusAreas.slice(0, 4).map((area) => (
                <span key={area} className="therapist-card__chip">{area}</span>
              ))}
              {therapist.focusAreas.length > 4 ? (
                <span className="therapist-card__chip therapist-card__chip--more">
                  +{therapist.focusAreas.length - 4}
                </span>
              ) : null}
            </div>
          </li>
        ) : null}
      </ul>

      <footer className="therapist-card__actions">
        {isPrimary ? (
          <span className="therapist-card__status therapist-card__status--primary">
            ✓ Seleccionado como opción principal
          </span>
        ) : isBackup ? (
          <span className="therapist-card__status therapist-card__status--backup">
            ✓ Seleccionado como 2ª opción
          </span>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-primary therapist-card__cta"
              onClick={() => onSelectPrimary?.(therapist)}
            >
              Vincularme con este terapeuta
            </button>
            <button
              type="button"
              className="btn btn-ghost therapist-card__cta-secondary"
              onClick={() => onSelectBackup?.(therapist)}
              disabled={!primarySelected}
              title={!primarySelected ? "Primero elige tu opción principal" : "Marcar como segunda opción"}
            >
              Como 2ª opción
            </button>
          </>
        )}
      </footer>
    </article>
  );
}
