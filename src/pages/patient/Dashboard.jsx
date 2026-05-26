import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Calendar, FileText, Pill, Heart, Clock, CheckCircle, CalendarPlus } from "lucide-react";
import { listSessionsByPatient } from "../../services/sessionsService";
import { listNotes } from "../../services/notesService";
import { listByPatient as listPrescriptions } from "../../services/prescriptionsService";
import { getClinicalHistory } from "../../services/clinicalHistoryService";
import { getPatient } from "../../services/patientsService";
import appointmentRequestsService from "../../services/appointmentRequestsService";
import linkageRequestsService from "../../services/linkageRequestsService";
import { formatDateISOToHuman } from "../../utils/formatters";
import Card, { CardHeader, CardBody } from "../../components/UI/Card";
import Badge from "../../components/UI/Badge";
import Button from "../../components/UI/Button";
import { SESSION_STATUS, SESSION_STATUS_LABEL, SESSION_MODALITY_LABEL } from "../../utils/constants";
import RequestAppointmentModal from "../../components/patient/RequestAppointmentModal";
import { SkeletonGrid, SkeletonLine, SkeletonTitle, SkeletonSubtitle } from "../../components/UI/Skeleton";

const sessionDate = (s) => s?.datetime || s?.scheduledAt || s?.time;

export default function PatientDashboard() {
  const { user } = useOutletContext() ?? {};
  const patientId = user?.patientId || user?.id;

  const [loading, setLoading] = useState(true);
  const [loadingStates, setLoadingStates] = useState({
    sessions: true,
    notes: true,
    prescriptions: true,
    history: true,
  });
  const [nextSession, setNextSession] = useState(null);
  const [lastNote, setLastNote] = useState(null);
  const [activePrescriptions, setActivePrescriptions] = useState([]);
  const [historyComplete, setHistoryComplete] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [linkStatus, setLinkStatus] = useState({ hasTherapist: true, hasPendingLinkage: false });

  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    let alive = true;
    async function load() {
      setLoading(true);
      setLoadingStates({ sessions: true, notes: true, prescriptions: true, history: true });
      
      try {
        // Cargar datos en paralelo con estados individuales
        const loadSessions = async () => {
          try {
            const sessionsResp = await listSessionsByPatient(patientId, { size: 10 });
            if (!alive) return;
            const sessions = Array.isArray(sessionsResp?.items)
              ? sessionsResp.items
              : sessionsResp || [];
            const upcoming = sessions
              .filter(
                (s) =>
                  s.status === SESSION_STATUS.PROGRAMADA ||
                  s.status === SESSION_STATUS.CONFIRMADA
              )
              .sort((a, b) => new Date(sessionDate(a)) - new Date(sessionDate(b)))[0];
            setNextSession(upcoming || null);
          } finally {
            if (alive) {
              setLoadingStates((prev) => ({ ...prev, sessions: false }));
            }
          }
        };

        const loadNotes = async () => {
          try {
            const notesResp = await listNotes(patientId, { page: 1, size: 1 });
            if (!alive) return;
            const notes = Array.isArray(notesResp?.items) ? notesResp.items : [];
            setLastNote(notes[0] || null);
          } finally {
            if (alive) {
              setLoadingStates((prev) => ({ ...prev, notes: false }));
            }
          }
        };

        const loadPrescriptions = async () => {
          try {
            const prescriptionsResp = await listPrescriptions(patientId);
            if (!alive) return;
            const prescriptions = Array.isArray(prescriptionsResp) ? prescriptionsResp : [];
            const active = prescriptions.filter((p) => !p.suspended && !p.completed);
            setActivePrescriptions(active);
          } finally {
            if (alive) {
              setLoadingStates((prev) => ({ ...prev, prescriptions: false }));
            }
          }
        };

        const loadHistory = async () => {
          try {
            const historyResp = await getClinicalHistory(patientId).catch(() => null);
            if (!alive) return;
            if (historyResp) {
              setHistoryComplete(!historyResp.isDraft);
            }
          } finally {
            if (alive) {
              setLoadingStates((prev) => ({ ...prev, history: false }));
            }
          }
        };

        const loadRequests = async () => {
          try {
            const items = await appointmentRequestsService.listForPatient(patientId);
            if (!alive) return;
            const pending = (items || []).filter((r) => r.status === "PENDING").length;
            setPendingRequests(pending);
          } catch {
            // silencioso: si no hay backend de requests, no rompemos el dashboard
          }
        };

        const loadLinkStatus = async () => {
          try {
            const [patient, linkages] = await Promise.all([
              getPatient(patientId).catch(() => null),
              linkageRequestsService.listForPatient({ patientId }).catch(() => []),
            ]);
            if (!alive) return;
            const hasTherapist = Boolean(patient?.professionalId);
            const hasPendingLinkage = (linkages || []).some((r) => r.status === "PENDING");
            setLinkStatus({ hasTherapist, hasPendingLinkage });
          } catch {
            // silencioso
          }
        };

        // Cargar todo en paralelo
        await Promise.allSettled([
          loadSessions(),
          loadNotes(),
          loadPrescriptions(),
          loadHistory(),
          loadRequests(),
          loadLinkStatus(),
        ]);
      } catch (err) {
        if (!alive) return;
        console.error("Error loading dashboard:", err);
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [patientId]);

  const firstName = user?.name?.split(" ")[0] || "Paciente";

  if (loading) {
    return (
      <section className="page stack-5 dashboard-page">
        <div className="page__header">
          <SkeletonTitle />
          <SkeletonSubtitle />
        </div>
        <SkeletonGrid count={4} />
      </section>
    );
  }

  return (
    <section className="page stack-5 dashboard-page">
      <div className="page__header cluster" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div className="stack-2">
          <h1 className="dashboard-page__title">Hola, {firstName}</h1>
          <p className="dashboard-page__subtitle">
            Aquí puedes revisar tu información de salud y próximas citas.
          </p>
        </div>
        {linkStatus.hasTherapist ? (
          <Button variant="primary" onClick={() => setRequestModalOpen(true)}>
            <CalendarPlus size={16} aria-hidden="true" style={{ marginRight: 6 }} />
            Solicitar cita
          </Button>
        ) : null}
      </div>

      {!linkStatus.hasTherapist ? (
        <div
          className="cluster gap-3 align-center"
          style={{
            padding: "1rem 1.25rem",
            background: "color-mix(in srgb, var(--primary) 8%, var(--surface))",
            border: "1px solid color-mix(in srgb, var(--primary) 28%, transparent)",
            borderRadius: "14px",
            flexWrap: "wrap",
          }}
        >
          <Heart size={22} aria-hidden="true" style={{ color: "var(--primary)" }} />
          <div className="stack-1" style={{ flex: "1 1 280px" }}>
            <strong>
              {linkStatus.hasPendingLinkage
                ? "Tu solicitud de vinculación está pendiente."
                : "Aún no estás vinculado con un terapeuta."}
            </strong>
            <span className="helper-text">
              {linkStatus.hasPendingLinkage
                ? "Recibirás una notificación cuando el terapeuta acepte. Mientras tanto puedes elegir una segunda opción."
                : "Para poder solicitar citas y construir tu expediente, primero elige un especialista."}
            </span>
          </div>
          <Link to="/#terapeutas" className="link link--button">Ver terapeutas disponibles</Link>
        </div>
      ) : null}

      {pendingRequests > 0 ? (
        <div
          className="cluster gap-2"
          style={{
            padding: "0.75rem 1rem",
            background: "color-mix(in srgb, var(--warning, #d97706) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--warning, #d97706) 30%, transparent)",
            borderRadius: "12px",
            alignItems: "center",
          }}
        >
          <Clock size={18} aria-hidden="true" />
          <span>
            Tienes <strong>{pendingRequests}</strong> {pendingRequests === 1 ? "solicitud de cita pendiente" : "solicitudes de cita pendientes"} de respuesta.
          </span>
          <Link to="/patient/sessions" className="link" style={{ marginLeft: "auto" }}>Ver detalle</Link>
        </div>
      ) : null}

      <div className="dashboard-grid">
        {/* Próxima sesión */}
        <Card hoverable={!!nextSession}>
          <CardHeader>
            <div className="cluster" style={{ alignItems: "center", gap: "var(--s-2)" }}>
              <Calendar size={20} />
              <h2>Tu próxima sesión</h2>
            </div>
          </CardHeader>
          <CardBody>
            {loadingStates.sessions ? (
              <div className="stack-3">
                <SkeletonLine width="60%" />
                <SkeletonLine width="40%" />
                <SkeletonLine width="30%" style={{ height: "2rem" }} />
              </div>
            ) : nextSession ? (
              <div className="stack-3">
                <div>
                  <p className="text-lg" style={{ fontWeight: 600 }}>
                    {formatDateISOToHuman(sessionDate(nextSession))}
                  </p>
                  <p className="helper-text">
                    {SESSION_MODALITY_LABEL[nextSession.modality] || nextSession.modality || "Presencial"}
                  </p>
                </div>
                <Badge
                  variant={
                    nextSession.status === SESSION_STATUS.CONFIRMADA
                      ? "success"
                      : "warning"
                  }
                >
                  {SESSION_STATUS_LABEL[nextSession.status] || "Programada"}
                </Badge>
                <Link
                  to="/patient/sessions"
                  className="link link--button"
                  style={{ marginTop: "var(--s-2)" }}
                >
                  Ver todas mis sesiones
                </Link>
              </div>
            ) : (
              <div className="stack-3">
                <p className="helper-text">
                  No tienes sesiones programadas en este momento.
                </p>
                {linkStatus.hasTherapist ? (
                  <Button variant="primary" size="sm" onClick={() => setRequestModalOpen(true)}>
                    <CalendarPlus size={14} aria-hidden="true" style={{ marginRight: 6 }} />
                    Solicitar una cita
                  </Button>
                ) : (
                  <Link to="/#terapeutas" className="link link--button">
                    Encuentra tu terapeuta
                  </Link>
                )}
                <Link to="/patient/sessions" className="link">
                  Ver historial de sesiones
                </Link>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Última nota */}
        <Card hoverable={!!lastNote}>
          <CardHeader>
            <div className="cluster" style={{ alignItems: "center", gap: "var(--s-2)" }}>
              <FileText size={20} />
              <h2>Seguimiento reciente</h2>
            </div>
          </CardHeader>
          <CardBody>
            {loadingStates.notes ? (
              <div className="stack-3">
                <SkeletonLine width="50%" />
                <SkeletonLine width="80%" />
                <SkeletonLine width="25%" style={{ height: "2rem" }} />
              </div>
            ) : lastNote ? (
              <div className="stack-3">
                <div>
                  <p className="text-lg" style={{ fontWeight: 600 }}>
                    {formatDateISOToHuman(lastNote.datetime)}
                  </p>
                  {lastNote.objetivo && (
                    <p className="helper-text" style={{ marginTop: "var(--s-1)" }}>
                      {lastNote.objetivo.length > 100
                        ? `${lastNote.objetivo.substring(0, 100)}...`
                        : lastNote.objetivo}
                    </p>
                  )}
                </div>
                <Link
                  to="/patient/notes"
                  className="link link--button"
                  style={{ marginTop: "var(--s-2)" }}
                >
                  Ver todas mis notas
                </Link>
              </div>
            ) : (
              <div className="stack-2">
                <p className="helper-text">
                  Aún no hay notas de seguimiento registradas.
                </p>
                <Link to="/patient/notes" className="link link--button">
                  Ver mis notas
                </Link>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Prescripciones activas */}
        <Card hoverable={activePrescriptions.length > 0}>
          <CardHeader>
            <div className="cluster" style={{ alignItems: "center", gap: "var(--s-2)" }}>
              <Pill size={20} />
              <h2>Indicaciones activas</h2>
            </div>
          </CardHeader>
          <CardBody>
            {loadingStates.prescriptions ? (
              <div className="stack-3">
                <SkeletonLine width="40%" />
                <SkeletonLine width="30%" style={{ height: "2rem" }} />
              </div>
            ) : activePrescriptions.length > 0 ? (
              <div className="stack-3">
                <p className="text-lg" style={{ fontWeight: 600 }}>
                  {activePrescriptions.length}{" "}
                  {activePrescriptions.length === 1
                    ? "prescripción activa"
                    : "prescripciones activas"}
                </p>
                <Link
                  to="/patient/prescriptions"
                  className="link link--button"
                  style={{ marginTop: "var(--s-2)" }}
                >
                  Ver todas mis prescripciones
                </Link>
              </div>
            ) : (
              <div className="stack-2">
                <p className="helper-text">
                  No tienes prescripciones activas en este momento.
                </p>
                <Link to="/patient/prescriptions" className="link link--button">
                  Ver historial de prescripciones
                </Link>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Estado del expediente */}
        <Card hoverable={false}>
          <CardHeader>
            <div className="cluster" style={{ alignItems: "center", gap: "var(--s-2)" }}>
              <Heart size={20} />
              <h2>Estado de tu expediente</h2>
            </div>
          </CardHeader>
          <CardBody>
            {loadingStates.history ? (
              <div className="stack-3">
                <SkeletonLine width="50%" />
                <SkeletonLine width="80%" />
                <SkeletonLine width="40%" style={{ height: "2rem" }} />
              </div>
            ) : (
              <div className="stack-3">
                <div className="cluster" style={{ alignItems: "center", gap: "var(--s-2)" }}>
                  {historyComplete ? (
                    <>
                      <CheckCircle size={20} style={{ color: "var(--success)" }} />
                      <p style={{ fontWeight: 600 }}>Expediente completo</p>
                    </>
                  ) : (
                    <>
                      <Clock size={20} style={{ color: "var(--warning)" }} />
                      <p style={{ fontWeight: 600 }}>Expediente en proceso</p>
                    </>
                  )}
                </div>
                <p className="helper-text">
                  {historyComplete
                    ? "Tu historia clínica está registrada y actualizada."
                    : "Tu historia clínica está siendo completada por tu profesional de salud."}
                </p>
                <Link to="/patient/clinical-history" className="link link--button">
                  Ver mi historia clínica
                </Link>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <RequestAppointmentModal
        open={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        onSuccess={() => {
          setPendingRequests((n) => n + 1);
        }}
      />
    </section>
  );
}

