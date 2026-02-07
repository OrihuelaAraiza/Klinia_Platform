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
const PatientDashboardNew = lazy(() => import("../pages/patient/Dashboard"));
const PatientClinicalHistory = lazy(() => import("../pages/patient/ClinicalHistory"));
const PatientNotesView = lazy(() => import("../pages/patient/Notes"));
const PatientSessionsView = lazy(() => import("../pages/patient/Sessions"));
const PatientPrescriptionsView = lazy(() => import("../pages/patient/Prescriptions"));
const PatientDocumentsView = lazy(() => import("../pages/patient/Documents"));
const PatientProfile = lazy(() => import("../pages/patient/Profile"));

const Home = lazy(() => import("../pages/Home"));
const Login = lazy(() => import("../pages/Login"));
const Register = lazy(() => import("../pages/Register"));
const ForgotPassword = lazy(() => import("../pages/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/ResetPassword"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Health = lazy(() => import("../pages/Health"));
const Patients = lazy(() => import("../pages/Patients"));
const PatientDetail = lazy(() => import("../pages/PatientDetail"));
const History = lazy(() => import("../pages/History"));
const AuthDebug = lazy(() => import("../pages/AuthDebug"));
const Notes = lazy(() => import("../pages/Notes"));
const NoteDetail = lazy(() => import("../pages/NoteDetail"));
const NoteEditor = lazy(() => import("../pages/NoteEditor"));
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
const PatientReportsList = lazy(() => import("../components/PatientReportList"));
const PatientDocuments = lazy(() => import("../pages/PatientDocument"));
const ProfileProfessional = lazy(() => import("../pages/Professional/ProfessionalProfile"));
const DisblePatient = lazy(()=> import("../pages/Professional/PatientDischarge"))

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
        role === ROLES.PATIENT ? ROUTES.patientDashboard : ROUTES.dashboard,
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

          {/* RESET PASSWORD */}
          <Route path={ROUTES.forgotPassword} element={<ForgotPassword />} />
          <Route path={ROUTES.resetPassword} element={<ResetPassword />} />

          {/* SÓLO ADMIN */}
          <Route element={<ProtectedRoute allow={[ROLES.ADMIN]} />}>
            <Route path="/auth/debug" element={<AuthDebug />} />
          </Route>

          {/* PLATAFORMA DEL PACIENTE */}
          <Route
            element={<ProtectedRoute allow={[ROLES.PATIENT]} />}
          >
            <Route path={ROUTES.patientDashboard} element={<PatientDashboardNew />} />
            <Route path={ROUTES.patientClinicalHistory} element={<PatientClinicalHistory />} />
            <Route path={ROUTES.patientNotes} element={<PatientNotesView />} />
            <Route path={ROUTES.patientSessions} element={<PatientSessionsView />} />
            <Route path={ROUTES.patientPrescriptions} element={<PatientPrescriptionsView />} />
            <Route path={ROUTES.patientDocuments} element={<PatientDocumentsView />} />
            <Route path={ROUTES.patientProfile} element={<PatientProfile />} />
          </Route>

          {/* PANEL COMPARTIDO (MÉDICO, ASISTENTE Y PACIENTE) */}
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
            <Route path={ROUTES.dashboard} element={<Dashboard />} />
            <Route path={ROUTES.patients} element={<Patients />} />
            <Route path={`${ROUTES.patients}/:id`} element={<PatientDetail />} />
            <Route path={`${ROUTES.patients}/:id/history`} element={<History />} />
            <Route path={ROUTES.sessions} element={<Sessions />} />
            <Route path={ROUTES.sessionsCalendar} element={<SessionsCalendar />} />
            <Route path="/patients/:id/sessions" element={<PatientSessions />} />
            {/* El asistente usualmente puede ver los reportes pero no crearlos (depende de tu regla) */}
            <Route path={ROUTES.reports} element={<Reports />} />
          </Route>

          {/* HERRAMIENTAS CLÍNICAS (SÓLO STAFF MÉDICO: PROFESIONAL Y ASISTENTE) */}
          <Route
            element={
              <ProtectedRoute
                allow={[ROLES.ADMIN, ROLES.PROFESSIONAL, ROLES.ASSISTANT]}
              />
            }
          >
            {/* Gestión de Notas */}
            <Route path="/patients/:id/notes" element={<ErrorBoundary><Notes /></ErrorBoundary>} />
            <Route path="/patients/:id/notes/new" element={<ErrorBoundary><NoteEditor /></ErrorBoundary>} />
            <Route path="/notes/:noteId" element={<ErrorBoundary><NoteDetail /></ErrorBoundary>} />
            
            {/* Recetas y Órdenes */}
            <Route path={ROUTES.prescriptions} element={<Prescriptions />} />
            <Route path={ROUTES.prescriptionsNew} element={<Prescriptions />} />
            <Route path={ROUTES.prescriptionDetail} element={<PrescriptionDetail />} />
            <Route path={ROUTES.orderNew} element={<OrderForm />} />
            <Route path={ROUTES.orderDetail} element={<OrderDetail />} />

            {/* Alta de Paciente */}
            <Route path={ROUTES.DisblePatient} element={<DisblePatient />} />
            
            {/* Gestión de Reportes y Documentos */}
            <Route path="/patients/:patientId/reports" element={<PatientReportsList />} />
            <Route path="/patients/:patientId/reports/:reportId" element={<ReportForm />} />
            <Route path="/patients/:id/documents" element={<PatientDocuments />} />
            <Route path={ROUTES.reportNew} element={<ReportForm />} />
            <Route path={ROUTES.reportDetail} element={<ReportDetail />} />

            {/* Dashboard médico base */}
            <Route path={ROUTES.dashboard} element={<Dashboard />} />
          </Route>

          {/* EXCLUSIVO DEL PROFESIONAL (CONFIGURACIÓN Y STAFF) */}
          <Route
            element={
              <ProtectedRoute allow={[ROLES.ADMIN, ROLES.PROFESSIONAL]} />
            }
          >
             <Route path="/ProfileProfessional" element={<ProfileProfessional/>} />
             {/* Si tuvieras una página de gestión de suscripción o finanzas, iría aquí */}
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}