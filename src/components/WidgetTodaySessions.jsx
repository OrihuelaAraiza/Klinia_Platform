import { memo } from "react";
import Button from "./UI/Button";

const Skeleton = ({ count = 3, testId }) => (
  <div className="dashboard-widget__skeleton" aria-hidden="true" data-testid={testId}>
    {Array.from({ length: count }).map((_, index) => (
      <div key={`widget-sessions-skeleton-${index}`} className="dashboard-widget__skeleton-row shimmer">
        <span className="skeleton skeleton--line" />
        <span className="skeleton skeleton--line short" />
      </div>
    ))}
  </div>
);

const WidgetTodaySessions = memo(function WidgetTodaySessions({
  loading = false,
  error = null,
  items = [],
  onRetry,
  onViewAll,
  onCreate,
  onItemClick,
  formatTime,
  getStatusLabel,
  canCreate = true,
}) {
  let content;
  if (loading) {
    content = <Skeleton testId="widget-sessions-loading" />;
  } else if (error) {
    content = (
      <div className="dashboard-widget__empty" data-testid="widget-sessions-error">
        <p>No se pudieron cargar las sesiones de hoy.</p>
        <Button variant="ghost" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    );
  } else if (!items.length) {
    content = (
      <div className="dashboard-widget__empty" data-testid="widget-sessions-empty">
        <p>Aún no hay sesiones programadas para hoy.</p>
        {canCreate ? (
          <Button variant="primary" size="sm" onClick={onCreate}>
            Crear sesión
          </Button>
        ) : null}
      </div>
    );
  } else {
    content = (
      <ul className="dashboard-widget__list" role="list" data-testid="widget-sessions-list">
        {items.map((item) => {
          const statusLabel = getStatusLabel(item.status);
          return (
            <li key={item.id ?? item.patientName}>
              <button
                type="button"
                className="dashboard-widget__item"
                onClick={() => onItemClick?.(item)}
                data-testid={`widget-sessions-row-${item.id ?? "unknown"}`}
              >
                <span className="dashboard-widget__item-main">
                  <span className="dashboard-widget__item-title">{item.patientName}</span>
                  <span className="dashboard-widget__item-meta">
                    {formatTime(item.time)} · {statusLabel}
                  </span>
                </span>
                <span className="dashboard-widget__item-icon" aria-hidden="true">
                  →
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <section className="dashboard-widget" aria-labelledby="dashboard-widget-sessions">
      <div className="dashboard-widget__header">
        <h2 id="dashboard-widget-sessions" className="dashboard-widget__title">
          Sesiones de hoy
        </h2>
        <Button variant="ghost" size="sm" onClick={onViewAll} data-testid="widget-sessions-view-all">
          Ver todo
        </Button>
      </div>
      {content}
    </section>
  );
});

export default WidgetTodaySessions;
