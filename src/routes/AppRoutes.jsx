import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import Patients from "../pages/Patients";
import PatientDetail from "../pages/PatientDetail";
import History from "../pages/History";
import Notes from "../pages/Notes";
import NoteDetail from "../pages/NoteDetail";
import ErrorBoundary from "../components/ErrorBoundary";
import Sessions from "../pages/Sessions";
import PatientSessions from "../pages/PatientSessions";
import Consents from "../pages/Consents";
import Prescriptions from "../pages/Prescriptions";
import Reports from "../pages/Reports";
import NotFound from "../pages/NotFound";
import auditService from "../services/auditService";
import storage from "../services/storage";
import { ROLES, ROUTES } from "../utils/constants";

function RouteAuditor() {
  const location = useLocation();

  useEffect(() => {
    if (storage.getToken()) {
      auditService.logAudit("route", { path: location.pathname });
    }
  }, [location.pathname]);

  return null;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <RouteAuditor />
      <Routes>
        <Route path={ROUTES.login} element={<Login />} />
        <Route path={ROUTES.register} element={<Register />} />

        <Route element={<ProtectedRoute />}>
          <Route path={ROUTES.dashboard} element={<Dashboard />} />
          <Route path={ROUTES.patients} element={<Patients />} />
          <Route path={`${ROUTES.patients}/:id`} element={<PatientDetail />} />
          <Route path={ROUTES.sessions} element={<Sessions />} />
          <Route path="/patients/:id/sessions" element={<PatientSessions />} />
          <Route path={ROUTES.consents} element={<Consents />} />
          <Route path={ROUTES.reports} element={<Reports />} />
        </Route>

        <Route element={<ProtectedRoute allow={[ROLES.ADMIN, ROLES.PROFESSIONAL, ROLES.ASSISTANT]} />}>
          <Route
            path="/patients/:id/notes"
            element={
              <ErrorBoundary>
                <Notes />
              </ErrorBoundary>
            }
          />
          <Route
            path="/patients/:id/notes/:noteId"
            element={
              <ErrorBoundary>
                <NoteDetail />
              </ErrorBoundary>
            }
          />
          <Route path="/patients/:id/consents" element={<PatientDetail />} />
        </Route>

        <Route element={<ProtectedRoute allow={[ROLES.ADMIN, ROLES.PROFESSIONAL]} />}>
          <Route path="/patients/:id/history" element={<History />} />
        </Route>

        <Route element={<ProtectedRoute allow={[ROLES.ADMIN, ROLES.PROFESSIONAL]} />}>
          <Route path={ROUTES.prescriptions} element={<Prescriptions />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
