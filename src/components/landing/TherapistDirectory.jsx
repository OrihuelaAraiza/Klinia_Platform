import { useEffect, useMemo, useState } from "react";
import { Search, X, Users } from "lucide-react";
import TherapistCard from "./TherapistCard";
import { listPublicTherapists } from "../../services/directoryService";
import selectionStorage from "../../services/selectionStorage";
import { SPECIALTIES, SPECIALTY_LABELS } from "../../utils/constants";
import { BRAND } from "../../config/brand";
import { SkeletonGrid } from "../UI/Skeleton";
import EmptyState from "../UI/EmptyState";

// Filtros visibles dependen de la marca activa.
const SPECIALTY_FILTERS = [
  { value: "", label: "Todos" },
  ...BRAND.specialties.map((sp) => ({ value: sp, label: SPECIALTY_LABELS[sp] || sp })),
];

export default function TherapistDirectory({ onSelectTherapist }) {
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ specialty: "", q: "" });
  const [selection, setSelection] = useState(() => selectionStorage.getSelection());

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listPublicTherapists(filters)
      .then((items) => { if (alive) setTherapists(items); })
      .catch(() => { if (alive) setTherapists([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [filters]);

  useEffect(() => {
    const handler = () => setSelection(selectionStorage.getSelection());
    window.addEventListener("therapist-selection-change", handler);
    return () => window.removeEventListener("therapist-selection-change", handler);
  }, []);

  const handlePrimary = (therapist) => {
    selectionStorage.setPrimary(therapist);
    onSelectTherapist?.(therapist, "primary");
  };
  const handleBackup = (therapist) => {
    selectionStorage.setBackup(therapist);
    onSelectTherapist?.(therapist, "backup");
  };

  const selectedAsMap = useMemo(() => {
    const map = {};
    if (selection.primary?.id) map[selection.primary.id] = "primary";
    if (selection.backup?.id) map[selection.backup.id] = "backup";
    return map;
  }, [selection]);

  return (
    <section className="therapist-directory" id={BRAND.copy.directoryAnchor}>
      <header className="therapist-directory__header">
        <div className="stack-1">
          <h2>{BRAND.id === "tanatologia" ? "Conoce a nuestros médicos paliativistas" : "Conoce a nuestros terapeutas"}</h2>
          <p className="helper-text">
            Elige al profesional con quien quieres iniciar tu proceso. Puedes marcar una segunda opción
            por si tu primera elección no tiene disponibilidad.
          </p>
        </div>
      </header>

      <div className="therapist-directory__filters">
        <div className="search-bar">
          <Search size={18} className="search-bar__icon" aria-hidden="true" />
          <input
            type="search"
            className="search-bar__input"
            placeholder="Busca por nombre, área de enfoque o ciudad…"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            aria-label="Buscar terapeutas"
          />
          {filters.q ? (
            <button
              type="button"
              className="search-bar__clear"
              aria-label="Limpiar búsqueda"
              onClick={() => setFilters((f) => ({ ...f, q: "" }))}
            >
              <X size={16} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <div className="therapist-directory__chips" role="tablist">
          {SPECIALTY_FILTERS.map((opt) => (
            <button
              key={opt.value || "all"}
              type="button"
              role="tab"
              aria-selected={filters.specialty === opt.value}
              className={`therapist-directory__chip${filters.specialty === opt.value ? " is-active" : ""}`}
              onClick={() => setFilters((f) => ({ ...f, specialty: opt.value }))}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <SkeletonGrid count={3} />
      ) : therapists.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No encontramos coincidencias"
          message="Prueba con otro filtro o término de búsqueda."
        />
      ) : (
        <div className="therapist-directory__grid">
          {therapists.map((t) => (
            <TherapistCard
              key={t.id}
              therapist={t}
              selectedAs={selectedAsMap[t.id] || null}
              primarySelected={Boolean(selection.primary?.id)}
              onSelectPrimary={handlePrimary}
              onSelectBackup={handleBackup}
            />
          ))}
        </div>
      )}
    </section>
  );
}
