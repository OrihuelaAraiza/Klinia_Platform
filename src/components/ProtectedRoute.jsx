import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import authService from "../services/authService";
import auditService from "../services/auditService";
import storage from "../services/storage";
import { ROLES, ROUTES } from "../utils/constants";
import NavSidebar from "./NavSidebar";
import Topbar from "./Topbar";

export default function ProtectedRoute({ allow, children }) {
  const token = storage.getToken();
  const role = storage.getRole();
  const user = storage.getUser();
  const location = useLocation();
  const navigate = useNavigate();

  if (!token || !role) {
    return <Navigate to={ROUTES.login} state={{ from: location }} replace />;
  }

  const allowedRoles = allow && allow.length ? allow : Object.values(ROLES);
  if (!allowedRoles.includes(role)) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  const handleLogout = useCallback(() => {
    authService.logout();
    auditService.logAudit("logout", { role });
    navigate(ROUTES.login, { replace: true });
  }, [navigate, role]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const media = window.matchMedia("(max-width: 1024px)");
    const handleChange = (event) => {
      setSidebarCollapsed(event.matches);
    };
    setSidebarCollapsed(media.matches);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  const outletContext = useMemo(
    () => ({
      role,
      user,
    }),
    [role, user]
  );

  return (
    <div className={`app-shell${sidebarCollapsed ? " app-shell--collapsed" : ""}`}>
      <NavSidebar
        role={role}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
      />
      <div className="app-shell__main">
        <Topbar
          user={user}
          role={role}
          onLogout={handleLogout}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
        />
        <main className="app-shell__content">
          {children ?? <Outlet context={outletContext} />}
        </main>
      </div>
    </div>
  );
}
