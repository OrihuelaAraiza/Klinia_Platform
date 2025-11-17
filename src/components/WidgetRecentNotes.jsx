import { memo } from "react";
import Button from "./UI/Button";

const Skeleton = ({ count = 3, testId }) => (
  <div className="dashboard-widget__skeleton" aria-hidden="true" data-testid={testId}>
    {Array.from({ length: count }).map((_, index) => (
      <div key={`widget-notes-skeleton-${index}`} className="dashboard-widget__skeleton-row shimmer">
        <span className="skeleton skeleton--line" />
        <span className="skeleton skeleton--line short" />
      </div>
    ))}
  </div>
);

const WidgetRecentNotes = memo(function WidgetRecentNotes({
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
    content = <Skeleton testId="widget-notes-loading" />;
  } else if (error) {
    content = (
      <div className="dashboard-widget__empty" data-testid="widget-notes-error">
        <p>No se pudieron cargar las notas recientes.</p>
        <Button variant="ghost" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    );
  } else if (!items.length) {
    content = (
      <div className="dashboard-widget__empty" data-testid="widget-notes-empty">
        <p>Registra el seguimiento clínico para verlo aquí.</p>
        {canCreate ? (
          <Button variant="primary" size="sm" onClick={onCreate}>
            Crear nota
          </Button>
        ) : null}
      </div>
    );
  } else {
    content = (
      <ul className="dashboard-widget__list" role="list" data-testid="widget-notes-list">
        {items.map((item) => (
          <li key={item.id ?? item.patientName}>
            <button
              type="button"
              className="dashboard-widget__item"
              onClick={() => onItemClick?.(item)}
              data-testid={`widget-notes-row-${item.id ?? "unknown"}`}
            >
              <span className="dashboard-widget__item-main">
                <span className="dashboard-widget__item-title">{item.patientName}</span>
                <span className="dashboard-widget__item-meta">
                  Cerrada {formatDateTime(item.closedAt)}
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
    <section className="dashboard-widget" aria-labelledby="dashboard-widget-notes">
      <div className="dashboard-widget__header">
        <h2 id="dashboard-widget-notes" className="dashboard-widget__title">
          Notas recientes
        </h2>
        <Button variant="ghost" size="sm" onClick={onViewAll} data-testid="widget-notes-view-all">
          Ver todo
        </Button>
      </div>
      {content}
    </section>
  );
});

export default WidgetRecentNotes;
