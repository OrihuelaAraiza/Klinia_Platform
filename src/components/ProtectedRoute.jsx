import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import authService from "../services/authService";
import auditService from "../services/auditService";
import storage from "../services/storage";
import { ROLES, ROUTES, resolveDestination } from "../utils/constants"; 
import NavSidebar from "./NavSidebar";
import PatientNavSidebar from "./PatientNavSidebar";
import Topbar from "./Topbar";

export default function ProtectedRoute({ allow, children }) {
  const token = storage.getToken();
  const role = storage.getRole();
  const user = storage.getUser();
  const location = useLocation();
  const navigate = useNavigate();
  const allowedRoles = allow && allow.length ? allow : Object.values(ROLES);

  // 1. Si estamos en desarrollo, forzamos un login automático
  const isDevMode = import.meta.env.MODE === 'development';
  const shouldRedirectToLogin = isDevMode ? false : !token || !role; // En modo dev no bloqueamos
  const shouldRedirectToDashboard = !shouldRedirectToLogin && !allowedRoles.includes(role);

  if (isDevMode && !token) {
    // 2. Si estamos en dev y no hay token, configuramos uno de prueba
    storage.setToken("dev-token"); // O el token de tu API si es necesario
    storage.setRole(ROLES.PATIENT); // O el rol que sea necesario
    storage.setUser({ username: 'demo-user', name: 'Demo User' }); // Aquí pones los datos que quieras
  }

  const buildVersion = import.meta.env.VITE_APP_VERSION || "dev";
  const buildMessage = import.meta.env.VITE_APP_COMMIT_MESSAGE || "";

  const handleLogout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      auditService.logAudit("auth_logout", { role });
      navigate(ROUTES.login, { replace: true });
    }
  }, [navigate, role]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const previousMobileRef = useRef(false);
  const previousOverflowRef = useRef("");
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  // Código restante de tu ProtectedRoute...

  if (shouldRedirectToLogin) {
    return <Navigate to={ROUTES.login} state={{ from: location }} replace />;
  }

  if (shouldRedirectToDashboard) {
    const correctHome = resolveDestination(role); 
    return <Navigate to={correctHome} replace />;
  }

  const sidebarId = role === ROLES.PATIENT ? "patient-sidebar" : "app-sidebar";
  const shouldShowOverlay = isMobile && !sidebarCollapsed;
  const isPatient = role === ROLES.PATIENT;

  return (
    <div
      className={`app-shell${sidebarCollapsed ? " app-shell--collapsed" : ""}${
        shouldShowOverlay ? " app-shell--menu-open" : ""
      }${isPatient ? " app-shell--patient" : ""}`}
    >
      {isPatient ? (
        <PatientNavSidebar
          collapsed={sidebarCollapsed}
          id={sidebarId}
        />
      ) : (
        <NavSidebar
          role={role}
          collapsed={sidebarCollapsed}
          id={sidebarId}
        />
      )}
      {shouldShowOverlay ? (
        <button
          type="button"
          className="app-shell__overlay"
          aria-label="Cerrar menú"
          onClick={() => setSidebarCollapsed(true)}
        />
      ) : null}
      <div className="app-shell__main">
        <Topbar
          user={user}
          role={role}
          onLogout={handleLogout}
          sidebarCollapsed={sidebarCollapsed}
          isMobile={isMobile}
          sidebarId={sidebarId}
          onToggleSidebar={toggleSidebar}
        />
        <main className="app-shell__content">
          {children ?? <Outlet context={outletContext} />}
        </main>
        <footer className="app-shell__footer">
          <span>Build: {buildVersion}</span>
          {buildMessage ? <span>{buildMessage}</span> : null}
        </footer>
      </div>
    </div>
  );
}
