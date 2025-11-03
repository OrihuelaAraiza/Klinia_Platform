import { memo } from "react";

function DashboardStatCard({ icon: Icon, label, value, subtext }) {
  return (
    <article className="stat-card">
      <div className="stat-icon">
        {Icon ? <Icon size={24} aria-hidden="true" /> : null}
      </div>
      <div className="stat-content">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        <p className="stat-subtext">{subtext}</p>
      </div>
    </article>
  );
}

const DashboardStats = memo(function DashboardStats({ stats = [] }) {
  return (
    <section className="dashboard-grid">
      {stats.map((stat) => (
        <DashboardStatCard key={stat.label} {...stat} />
      ))}
    </section>
  );
});

export default DashboardStats;
export { DashboardStatCard };

