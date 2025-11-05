import { memo } from "react";
import DashboardCard from "./DashboardCard";

const DEFAULT_SKELETONS = 4;

const DashboardStats = memo(function DashboardStats({
  stats = [],
  loading = false,
  skeletonCount = DEFAULT_SKELETONS,
  emptyMessage = "No hay métricas disponibles.",
  onStatClick,
}) {
  const totalSkeletons = skeletonCount || DEFAULT_SKELETONS;

  return (
    <section className="dashboard-grid" aria-live="polite" data-testid="dashboard-stats">
      {loading
        ? Array.from({ length: totalSkeletons }).map((_, index) => (
            <article
              key={`stat-skeleton-${index}`}
              className="stat-card skeleton-card shimmer"
              aria-hidden="true"
              data-testid="dashboard-stats-skeleton"
            >
              <span className="skeleton skeleton--icon" />
              <span className="skeleton skeleton--line" />
              <span className="skeleton skeleton--line short" />
            </article>
          ))
        : stats.length > 0
        ? stats.map((stat, index) => (
            <DashboardCard
              key={stat.id || stat.label}
              variant="stat"
              icon={stat.icon}
              title={stat.label}
              value={stat.value}
              subtext={stat.subtext}
              delay={index * 0.05}
              dataTestId={stat.testId}
              onStatClick={onStatClick ? () => onStatClick(stat) : undefined}
            />
          ))
        : emptyMessage
        ? (
            <p className="dashboard-stats__empty" data-testid="dashboard-stats-empty">
              {emptyMessage}
            </p>
          )
        : null}
    </section>
  );
});

export default DashboardStats;
