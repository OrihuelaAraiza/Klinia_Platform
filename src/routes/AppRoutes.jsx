import { Suspense, lazy, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
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
const OrderForm = lazy(() => import("../pages/OrderForm"));
const OrderDetail = lazy(() => import("../pages/OrderDetail"));
const ReportForm = lazy(() => import("../pages/ReportForm"));
const ReportDetail = lazy(() => import("../pages/ReportDetail"));
const NotFound = lazy(() => import("../pages/NotFound"));

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

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <RouteAuditor />
      <Suspense fallback={<PageSkeleton />}>

        <Routes>
          {/* PÚBLICAS */}
          <Route path={ROUTES.home} element={<Home />} />
          <Route path={ROUTES.login} element={<Login />} />
          <Route path={ROUTES.register} element={<Register />} />
          <Route path="/register/patient" element={<PatientRegister />} />
          <Route path="/health" element={<Health />} />

          <Route element={<ProtectedRoute allow={[ROLES.ADMIN]} />}>
            <Route path={ROUTES.dashboard} element={<Dashboard />} />
            <Route path="/auth/debug" element={<AuthDebug />} />
          </Route>

          <Route
            element={
              <ProtectedRoute
                allow={[
                  ROLES.ADMIN,
                  ROLES.PROFESSIONAL,
                  ROLES.ASSISTANT,
                  ROLES.PATIENT,
                ]}
              />
            }
          >
            <Route path="/patient/dashboard" element={<PatientDashboard />} />
            <Route path={ROUTES.patients} element={<Patients />} />
            <Route path={`${ROUTES.patients}/:id`} element={<PatientDetail />} />
            <Route
              path={`${ROUTES.patients}/:id/history`}
              element={<History />}
            />
            <Route path={ROUTES.sessions} element={<Sessions />} />
            <Route
              path={ROUTES.sessionsCalendar}
              element={<SessionsCalendar />}
            />
            <Route
              path="/patients/:id/sessions"
              element={<PatientSessions />}
            />
            <Route path={ROUTES.consents} element={<Consents />} />
            <Route path={ROUTES.reports} element={<Reports />} />
            <Route path="/profile/medical" element={<Dashboard />} />
          </Route>

          <Route
            element={
              <ProtectedRoute
                allow={[ROLES.ADMIN, ROLES.PROFESSIONAL, ROLES.ASSISTANT]}
              />
            }
          >
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
            <Route
              path={ROUTES.prescriptions}
              element={<Prescriptions />}
            />
            <Route
              path={ROUTES.prescriptionsNew}
              element={<Prescriptions />}
            />
            <Route
              path={ROUTES.prescriptionDetail}
              element={<PrescriptionDetail />}
            />
            <Route
              path={ROUTES.orderNew}
              element={<OrderForm />}
            />
            <Route
              path={ROUTES.orderDetail}
              element={<OrderDetail />}
            />
            <Route
              path={ROUTES.reportNew}
              element={<ReportForm />}
            />
            <Route
              path={ROUTES.reportDetail}
              element={<ReportDetail />}
            />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
