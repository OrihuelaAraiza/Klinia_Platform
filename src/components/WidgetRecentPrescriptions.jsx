import { memo } from "react";
import Button from "./UI/Button";

const Skeleton = ({ count = 3, testId }) => (
  <div className="dashboard-widget__skeleton" aria-hidden="true" data-testid={testId}>
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={`widget-prescriptions-skeleton-${index}`}
        className="dashboard-widget__skeleton-row shimmer"
      >
        <span className="skeleton skeleton--line" />
        <span className="skeleton skeleton--line short" />
      </div>
    ))}
  </div>
);

const WidgetRecentPrescriptions = memo(function WidgetRecentPrescriptions({
  loading = false,
  error = null,
  items = [],
  onRetry,
  onViewAll,
  onCreate,
  onItemClick,
  formatDateTime,
  canCreate = true,
}) {
  let content;
  if (loading) {
    content = <Skeleton testId="widget-prescriptions-loading" />;
  } else if (error) {
    content = (
      <div className="dashboard-widget__empty" data-testid="widget-prescriptions-error">
        <p>No se pudieron cargar las prescripciones recientes.</p>
        <Button variant="ghost" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    );
  } else if (!items.length) {
    content = (
      <div className="dashboard-widget__empty" data-testid="widget-prescriptions-empty">
        <p>Emite tu primera prescripción para verla en este panel.</p>
        {canCreate ? (
          <Button variant="primary" size="sm" onClick={onCreate}>
            Crear prescripción
          </Button>
        ) : null}
      </div>
    );
  } else {
    content = (
      <ul className="dashboard-widget__list" role="list" data-testid="widget-prescriptions-list">
        {items.map((item) => (
          <li key={item.id ?? item.patientName}>
            <button
              type="button"
              className="dashboard-widget__item"
              onClick={() => onItemClick?.(item)}
              data-testid={`widget-prescriptions-row-${item.id ?? "unknown"}`}
            >
              <span className="dashboard-widget__item-main">
                <span className="dashboard-widget__item-title">{item.patientName}</span>
                <span className="dashboard-widget__item-meta">
                  {item.folio ? `Folio ${item.folio}` : "Sin folio"} · {formatDateTime(item.signedAt)}
                </span>
              </span>
              <span className="dashboard-widget__item-icon" aria-hidden="true">
                →
              </span>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className="dashboard-widget" aria-labelledby="dashboard-widget-prescriptions">
      <div className="dashboard-widget__header">
        <h2 id="dashboard-widget-prescriptions" className="dashboard-widget__title">
          Prescripciones recientes
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewAll}
          data-testid="widget-prescriptions-view-all"
        >
          Ver todo
        </Button>
      </div>
      {content}
    </section>
  );
});

export default WidgetRecentPrescriptions;
