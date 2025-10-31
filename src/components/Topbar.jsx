import { useState } from "react";
import Button from "./UI/Button";
import Modal from "./UI/Modal";
import { ROLES_LABEL } from "../utils/constants";

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

export default function Topbar({ user, role, onLogout, onToggleSidebar, sidebarCollapsed }) {
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

  return (
    <header className="topbar">
      <div className="topbar__left">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? "Expandir menú" : "Colapsar menú"}
          className="topbar__toggle"
        >
          {sidebarCollapsed ? <MenuIcon aria-hidden="true" /> : <CollapseIcon aria-hidden="true" />}
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
      <div className="topbar__menu">
        <details>
          <summary>
            <span className="topbar__avatar">{initials}</span>
            <span className="topbar__summary-name">{name}</span>
          </summary>
          <div className="topbar__menu-content">
            <button type="button">Perfil (próximamente)</button>
            <button type="button" className="danger" onClick={openConfirmLogout}>
              Cerrar sesión
            </button>
          </div>
        </details>
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
