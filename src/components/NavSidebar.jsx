import Logo from "./Brand/Logo";
import { ROLES, ROUTES } from "../utils/constants";
import SidebarLink from "./SidebarLink";

const NAV_ITEMS = [
  { to: ROUTES.dashboard, label: "Inicio", icon: DashboardIcon, roles: [ROLES.ADMIN, ROLES.PROFESSIONAL, ROLES.ASSISTANT] },
  { to: ROUTES.patients, label: "Pacientes", icon: UsersIcon, roles: [ROLES.ADMIN, ROLES.PROFESSIONAL, ROLES.ASSISTANT] },
  { to: ROUTES.sessions, label: "Agenda", icon: CalendarIcon, roles: [ROLES.ADMIN, ROLES.PROFESSIONAL, ROLES.ASSISTANT] },
  { to: ROUTES.prescriptions, label: "Sesiones", icon: ClipboardIcon, roles: [ROLES.ADMIN, ROLES.PROFESSIONAL, ROLES.ASSISTANT] },
  { to: ROUTES.reports, label: "Reportes", icon: ChartIcon, roles: [ROLES.ADMIN, ROLES.PROFESSIONAL] },
  { to: ROUTES.supervision, label: "Bitácora", icon: ShieldIcon, roles: [ROLES.ADMIN] },
];

function DashboardIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M3 13h8V3H3v10Zm10 8h8V3h-8v18Zm-10 0h8v-6H3v6Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UsersIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M12 3 4 6v6c0 5 3.8 9.4 8 10 4.2-.6 8-5 8-10V6l-8-3Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClipboardIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M8 3h8a1 1 0 0 1 1 1v2H7V4a1 1 0 0 1 1-1Z" />
      <path d="M9 3a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2" strokeLinecap="round" />
      <path d="M9 12h6M9 16h6" strokeLinecap="round" />
    </svg>
  );
}

function ChartIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M4 19V5M12 19V9M20 19v-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function NavSidebar({
  role,
  collapsed,
  id = "app-sidebar",
}) {
  const filteredItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <nav
      id={id}
      className={`sidebar${collapsed ? " sidebar--collapsed" : ""}`}
      aria-label="Navegación principal"
    >
      <div className="sidebar__brand">
        <Logo
          variant="horizontal"
          size="md"
          theme="dark"
          alt="BreveMente"
          className="sidebar__logo"
        />
      </div>
      <ul className="sidebar__list">
        {filteredItems.map((item) => (
          <li key={item.to} className="sidebar__item">
            <SidebarLink
              to={item.to}
              label={item.label}
              icon={item.icon}
              collapsed={collapsed}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}
