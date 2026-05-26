import { memo } from "react";
import { NavLink } from "react-router-dom";

function SidebarLink({
  to,
  label,
  icon: Icon,
  collapsed = false,
  badge,
}) {
  const ariaLabel = badge
    ? `${label} (${badge} pendiente${badge === 1 ? "" : "s"})`
    : collapsed
    ? label
    : undefined;
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `sidebar__link${isActive ? " is-active" : ""}`}
      aria-label={ariaLabel}
      data-tooltip={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
    >
      {({ isActive }) => (
        <>
          {Icon ? <Icon className="sidebar__icon" aria-hidden="true" /> : null}
          <span className="sidebar__label">{label}</span>
          {badge ? (
            <span className="sidebar__badge" aria-hidden="true">{badge}</span>
          ) : null}
          {isActive ? <span className="visually-hidden">Actual</span> : null}
        </>
      )}
    </NavLink>
  );
}

export default memo(SidebarLink);
