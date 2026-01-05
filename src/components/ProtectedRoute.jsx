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
  const shouldRedirectToLogin = !token || !role;
  const shouldRedirectToDashboard = !shouldRedirectToLogin && !allowedRoles.includes(role);
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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const media = window.matchMedia("(max-width: 768px)");
    const handleChange = (event) => {
      setIsMobile(event.matches);
    };
    setIsMobile(media.matches);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!isMobile && previousMobileRef.current) {
      const shouldCollapse = window.matchMedia("(max-width: 1024px)").matches;
      setSidebarCollapsed(shouldCollapse);
    }
    if (isMobile && !previousMobileRef.current) {
      setSidebarCollapsed(true);
    }
    previousMobileRef.current = isMobile;
  }, [isMobile]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    if (!isMobile || sidebarCollapsed) {
      if (previousOverflowRef.current) {
        document.body.style.overflow = previousOverflowRef.current;
        previousOverflowRef.current = "";
      } else {
        document.body.style.overflow = "";
      }
      return undefined;
    }
    previousOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflowRef.current;
      previousOverflowRef.current = "";
    };
  }, [isMobile, sidebarCollapsed]);

  useEffect(() => {
    if (!isMobile) {
      return;
    }
    setSidebarCollapsed(true);
  }, [isMobile, location.pathname]);

  const outletContext = useMemo(
    () => ({
      role,
      user,
      toggleSidebar,
      onLogout: handleLogout,
      isMobile,
      sidebarCollapsed,
    }),
    [role, user, toggleSidebar, isMobile, sidebarCollapsed]
  );
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
