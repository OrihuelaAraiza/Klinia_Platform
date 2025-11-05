import { memo } from "react";
import DashboardCard from "./DashboardCard";
import Button from "./UI/Button";

const DashboardQuickLinks = memo(function DashboardQuickLinks({
  actions = [],
  onNavigate,
  loadingAction,
  onEditShortcuts,
  emptyTitle = "Sin accesos visibles",
  emptyDescription = "Selecciona los módulos que deseas mostrar usando “Editar accesos rápidos”.",
  emptyCtaLabel = "Configurar accesos",
}) {
  return (
    <div data-testid="dashboard-quick-links" className="dashboard-quick-links">
      {actions.length === 0 ? (
        <div className="dashboard-module dashboard-module--static" data-testid="dashboard-quick-links-empty">
          <h2 className="dashboard-page__section-title">{emptyTitle}</h2>
          <p className="dashboard-page__body-text">{emptyDescription}</p>
          {onEditShortcuts ? (
            <Button
              variant="accent"
              size="sm"
              onClick={onEditShortcuts}
              data-testid="dashboard-quick-links-edit"
            >
              {emptyCtaLabel}
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="dashboard-quick-links-grid">
          {actions.map((action, index) => (
            <DashboardCard
              key={action.id}
              dataTestId={`dashboard-quick-link-${action.id}`}
              variant="shortcut"
              icon={action.icon}
              title={action.title}
              description={action.description}
              onClick={action.disabled ? undefined : () => onNavigate?.(action.to, action)}
              loading={loadingAction === action.to}
              delay={index * 0.05}
              ariaLabel={action.ariaLabel}
              ctaLabel={action.ctaLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export default DashboardQuickLinks;
