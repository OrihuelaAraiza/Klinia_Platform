import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import ErrorBoundary from "../components/ErrorBoundary";
import auditService from "../services/auditService";
import storage from "../services/storage";
import { ROLES, ROUTES } from "../utils/constants";
import PageSkeleton from "../components/PageSkeleton";
import PatientRegister from "../pages/PatientRegister";
import PatientDashboard from "../pages/PatientDashboard";

const Home = lazy(() => import("../pages/Home"));
const Login = lazy(() => import("../pages/Login"));
const Register = lazy(() => import("../pages/Register"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Health = lazy(() => import("../pages/Health"));
const Patients = lazy(() => import("../pages/Patients"));
const PatientDetail = lazy(() => import("../pages/PatientDetail"));
const History = lazy(() => import("../pages/History"));
const AuthDebug = lazy(() => import("../pages/AuthDebug"));
const Notes = lazy(() => import("../pages/Notes"));
const NoteDetail = lazy(() => import("../pages/NoteDetail"));
const Sessions = lazy(() => import("../pages/Sessions"));
const PatientSessions = lazy(() => import("../pages/PatientSessions"));
const SessionsCalendar = lazy(() => import("../pages/SessionsCalendar"));
const Consents = lazy(() => import("../pages/Consents"));
const Prescriptions = lazy(() => import("../pages/Prescriptions"));
const PrescriptionDetail = lazy(() => import("../pages/PrescriptionDetail"));
const Reports = lazy(() => import("../pages/Reports"));
const NotFound = lazy(() => import("../pages/NotFound"));
const DashboardPatient = lazy(() => import("../pages/PatientDashboard"));



function RouteAuditor() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (storage.getToken()) {
      auditService.logAudit("route", { path: location.pathname });
    }
  }, [location.pathname]);

  useEffect(() => {
    const token = storage.getToken();
    const role = storage.getRole();
    if (!token || !role) return;

    if (
      location.pathname === ROUTES.home ||
      location.pathname === ROUTES.login ||
      location.pathname === ROUTES.register
    ) {
      navigate(
        role === ROLES.PATIENT ? "/patient/dashboard" : ROUTES.dashboard,
        { replace: true }
      );
    }
  }, [location.pathname, navigate]);

  return null;
}


// ... (Tus imports) ...

export default function AppRoutes() {
<<<<<<< HEAD
  return (
    <BrowserRouter>
      <RouteAuditor />
      <Suspense fallback={<PageSkeleton />}>
=======
  return (
    <BrowserRouter>
      <RouteAuditor />
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path={ROUTES.home} element={<Home />} />
          <Route path={ROUTES.login} element={<Login />} />
          <Route path={ROUTES.register} element={<Register />} />
          <Route path="/health" element={<Health />} />
>>>>>>> main

        <Routes>
            <Route path={ROUTES.login} element={<Login />} />
            <Route path={ROUTES.register} element={<Register />} />
            <Route path="/register/patient" element={<PatientRegister />} />
            <Route path="/health" element={<Health />} />


            <Route element={<ProtectedRoute allow={[ROLES.ADMIN]} />}>
              <Route path={ROUTES.dashboard} element={<Dashboard />} /> {/* <-- Dashboard principal */}
              <Route path="/auth/debug" element={<AuthDebug />} />
            </Route>


            <Route element={<ProtectedRoute allow={[ROLES.ADMIN, ROLES.PROFESSIONAL, ROLES.ASSISTANT, ROLES.PATIENT]} />}>
                  


            <Route path="/patient/dashboard" element={<PatientDashboard />} /> 

            {/* Gestión de pacientes */}
            <Route path={ROUTES.patients} element={<Patients />} />
            <Route path={`${ROUTES.patients}/:id`} element={<PatientDetail />} />
            
            {/* Rutas de Sesiones y Reportes (Van en el bloque más amplio) */}
            <Route path={ROUTES.sessions} element={<Sessions />} />
            <Route path={ROUTES.sessionsCalendar} element={<SessionsCalendar />} />
            <Route path="/patients/:id/sessions" element={<PatientSessions />} />
            <Route path={ROUTES.consents} element={<Consents />} />
            <Route path={ROUTES.reports} element={<Reports />} />
            <Route path="/profile/medical" element={<Dashboard />} /> {/* Placeholder */}
            <Route path="*" element={<NotFound />} />
            </Route>


          {/* =====================================================
          RUTAS SOLO PARA STAFF (Mantener para RBAC específico)
          ===================================================== */}
          
            <Route element={<ProtectedRoute allow={[ROLES.ADMIN, ROLES.PROFESSIONAL, ROLES.ASSISTANT]} />}>
            <Route path="/patients/:id/notes" element={<ErrorBoundary><Notes /></ErrorBoundary>} />
            <Route path="/patients/:id/notes/:noteId" element={<ErrorBoundary><NoteDetail /></ErrorBoundary>} />
            <Route path="/patients/:id/consents" element={<PatientDetail />} />
            <Route path={ROUTES.prescriptions} element={<Prescriptions />} />
            <Route path={ROUTES.prescriptionsNew} element={<Prescriptions />} />
            <Route path={ROUTES.prescriptionDetail} element={<PrescriptionDetail />} />
            </Route>
            

<Route path="*" element={<NotFound />} />

 </Routes>
 </Suspense>
</BrowserRouter>
 );
}