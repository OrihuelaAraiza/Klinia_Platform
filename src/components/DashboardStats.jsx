import { memo } from "react";
import DashboardCard from "./DashboardCard";

const DashboardStats = memo(function DashboardStats({ stats = [] }) {
  return (
    <section className="dashboard-grid">
      {stats.map((stat, index) => (
        <DashboardCard
          key={stat.label}
          variant="stat"
          icon={stat.icon}
          title={stat.label}
          value={stat.value}
          subtext={stat.subtext}
          delay={index * 0.05}
        />
      ))}
    </section>
  );
});

export default DashboardStats;
