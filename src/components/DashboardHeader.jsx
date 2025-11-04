import { memo } from "react";

function DashboardHeader({ title, subtitle, children }) {
  return (
    <div className="page-header">
      <div className="stack-1">
        <h1 className="dashboard-page__title">{title}</h1>
        {subtitle ? <p className="dashboard-page__subtitle">{subtitle}</p> : null}
      </div>
      {children ? <div className="dashboard-header__actions">{children}</div> : null}
    </div>
  );
}

export default memo(DashboardHeader);
