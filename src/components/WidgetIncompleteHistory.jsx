import { memo } from "react";
import Button from "./UI/Button";
import { FileText, AlertCircle } from "lucide-react";

const Skeleton = ({ count = 3, testId }) => (
  <div className="dashboard-widget__skeleton" aria-hidden="true" data-testid={testId}>
    {Array.from({ length: count }).map((_, index) => (
      <div key={`widget-history-skeleton-${index}`} className="dashboard-widget__skeleton-row shimmer">
        <span className="skeleton skeleton--line" />
        <span className="skeleton skeleton--line short" />
      </div>
    ))}
  </div>
);

const WidgetIncompleteHistory = memo(function WidgetIncompleteHistory({
  loading = false,
  error = null,
  items = [],
  onRetry,
  onViewAll,
  onItemClick,
  formatDateTime,
  canCreate = true,
}) {
  let content;
  if (loading) {
    content = <Skeleton testId="widget-history-loading" />;
  } else if (error) {
    content = (
      <div className="dashboard-widget__empty" data-testid="widget-history-error">
        <p>No se pudieron cargar las historias clínicas incompletas.</p>
        <Button variant="ghost" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    );
  } else if (!items.length) {
    content = (
      <div className="dashboard-widget__empty" data-testid="widget-history-empty">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <FileText size={20} style={{ opacity: 0.6 }} />
          <p style={{ margin: 0 }}>Todas las historias clínicas están completas.</p>
        </div>
        <p className="helper-text" style={{ margin: 0 }}>
          No hay pacientes pendientes de completar su expediente.
        </p>
      </div>
    );
  } else {
    content = (
      <ul className="dashboard-widget__list" role="list" data-testid="widget-history-list">
        {items.map((item) => {
          const completionPercentage = item.completionPercentage || 0;
          const missingCount = item.missingFieldsCount || 0;
          const isUrgent = completionPercentage < 30;
          
          return (
            <li key={item.id ?? item.patientId}>
              <button
                type="button"
                className="dashboard-widget__item"
                onClick={() => onItemClick?.(item)}
                data-testid={`widget-history-row-${item.id ?? "unknown"}`}
              >
                <span className="dashboard-widget__item-main">
                  <span className="dashboard-widget__item-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {isUrgent && (
                      <AlertCircle size={16} style={{ color: "var(--color-error)", flexShrink: 0 }} aria-label="Urgente" />
                    )}
                    {item.patientName}
                  </span>
                  <span className="dashboard-widget__item-meta">
                    {completionPercentage > 0 ? (
                      <>
                        {completionPercentage}% completo
                        {missingCount > 0 && ` · ${missingCount} campo${missingCount > 1 ? "s" : ""} faltante${missingCount > 1 ? "s" : ""}`}
                      </>
                    ) : (
                      "Historia clínica no iniciada"
                    )}
                    {item.lastUpdated && ` · ${formatDateTime(item.lastUpdated)}`}
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
    <section className="dashboard-widget" aria-labelledby="dashboard-widget-history">
      <div className="dashboard-widget__header">
        <h2 id="dashboard-widget-history" className="dashboard-widget__title">
          Historias clínicas incompletas
        </h2>
        <Button variant="ghost" size="sm" onClick={onViewAll} data-testid="widget-history-view-all">
          Ver todo
        </Button>
      </div>
      {content}
    </section>
  );
});

export default WidgetIncompleteHistory;

