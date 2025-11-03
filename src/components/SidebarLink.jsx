import { NavLink } from "react-router-dom";

export default function SidebarLink({
  to,
  label,
  icon: Icon,
  collapsed = false,
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `sidebar__link${isActive ? " is-active" : ""}`}
      aria-label={collapsed ? label : undefined}
      data-tooltip={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
    >
      {({ isActive }) => (
        <>
          {Icon ? <Icon className="sidebar__icon" aria-hidden="true" /> : null}
          <span className="sidebar__label">{label}</span>
          {isActive ? <span className="visually-hidden">Actual</span> : null}
        </>
      )}
    </NavLink>
  );
}

