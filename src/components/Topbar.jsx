import { useState } from "react";
import Button from "./UI/Button";
import Modal from "./UI/Modal";
import { ROLES, ROLES_LABEL } from "../utils/constants";
import ThemeToggle from "./ThemeToggle";
import { Link, useNavigate } from "react-router-dom";

function getInitials(name) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return initials.join("") || "U";
}

function MenuIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CollapseIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="m15 9-3 3 3 3M9 15l3-3-3-3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 4v16M20 4v16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="m7 7 10 10M17 7 7 17" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Topbar({
  user,
  role,
  onLogout,
  onToggleSidebar,
  sidebarCollapsed,
  isMobile = false,
  sidebarId,
}) {
  const name = user?.name ?? "Usuario";
  const roleLabel = ROLES_LABEL[role] ?? role ?? "";
  const initials = getInitials(name);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const openConfirmLogout = () => setConfirmLogoutOpen(true);
  const closeConfirmLogout = () => {
    if (!logoutLoading) {
      setConfirmLogoutOpen(false);
    }
  };
  const confirmLogout = async () => {
    if (logoutLoading) {
      return;
    }
    setLogoutLoading(true);
    setConfirmLogoutOpen(false);
    try {
      await onLogout?.();
    } finally {
      setLogoutLoading(false);
    }
  };

  const toggleLabel = isMobile
    ? sidebarCollapsed
      ? "Abrir menú"
      : "Cerrar menú"
    : sidebarCollapsed
    ? "Expandir menú"
    : "Colapsar menú";

  const ToggleIcon = isMobile
    ? sidebarCollapsed
      ? MenuIcon
      : CloseIcon
    : sidebarCollapsed
    ? MenuIcon
    : CollapseIcon;

    const navigate = useNavigate();

    const goToProfile = () => {
        if (role === ROLES.PATIENT) {
            navigate("/patient/profile");
        } else {
        navigate("/ProfileProfessional"); 
        }
    };

  return (
    <header className="topbar">
      <div className="topbar__left">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSidebar}
          aria-label={toggleLabel}
          aria-controls={sidebarId}
          aria-expanded={!sidebarCollapsed}
          className="topbar__toggle"
        >
          {ToggleIcon ? <ToggleIcon aria-hidden="true" /> : null}
        </Button>
        <div className="topbar__user">
          <p className="topbar__greeting">Hola, {name}</p>
          {roleLabel ? (
            <span className="topbar__role" aria-live="polite">
              {roleLabel}
            </span>
          ) : null}
        </div>
      </div>
      <div className="topbar__actions">
        <ThemeToggle className="topbar__toggle topbar__theme-toggle" />
        <div className="topbar__menu">
          <details>
            <summary>
              <span className="topbar__avatar">{initials}</span>
              <span className="topbar__summary-name">{name}</span>
            </summary>
            <div className="topbar__menu-content">
              <button type="button" onClick={goToProfile}> Perfil </button>
              <button type="button" className="danger" onClick={openConfirmLogout}>
                Cerrar sesión
              </button>
            </div>
          </details>
        </div>
      </div>
      <Modal
        open={confirmLogoutOpen}
        onClose={closeConfirmLogout}
        title="Confirmar cierre de sesión"
        footer={
          <div className="cluster">
            <Button variant="ghost" onClick={closeConfirmLogout}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmLogout} loading={logoutLoading} disabled={logoutLoading}>
              Cerrar sesión
            </Button>
          </div>
        }
      >
        <p className="helper-text">Confirma que deseas cerrar sesión en la plataforma.</p>
      </Modal>
    </header>
  );
}
