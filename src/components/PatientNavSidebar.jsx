import Logo from "./Brand/Logo";
import { ROLES } from "../utils/constants";
import SidebarLink from "./SidebarLink";

const PATIENT_NAV_ITEMS = [
  { to: "/patient/dashboard", label: "Inicio", icon: HomeIcon },
  { to: "/patient/clinical-history", label: "Mi Historia Clínica", icon: FileTextIcon },
  { to: "/patient/notes", label: "Mis Notas", icon: ClipboardIcon },
  { to: "/patient/sessions", label: "Mi Agenda", icon: CalendarIcon },
  { to: "/patient/prescriptions", label: "Mis Sesiones", icon: PillIcon },
  { to: "/patient/documents", label: "Documentos", icon: FolderIcon },
];

function HomeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 22V12h6v10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FileTextIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClipboardIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" strokeLinecap="round" strokeLinejoin="round" />
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

function PillIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m8.5 8.5 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FolderIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PatientNavSidebar({
  collapsed,
  id = "patient-sidebar",
}) {
  return (
    <nav
      id={id}
      className={`sidebar sidebar--patient${collapsed ? " sidebar--collapsed" : ""}`}
      aria-label="Navegación del paciente"
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
        {PATIENT_NAV_ITEMS.map((item) => (
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
