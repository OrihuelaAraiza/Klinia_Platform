import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { listSessionsByPatient, changeStatus } from "../../services/sessionsService";
import appointmentRequestsService from "../../services/appointmentRequestsService";
import { formatDateISOToHuman } from "../../utils/formatters";
import Card, { CardHeader, CardBody } from "../../components/UI/Card";
import Badge from "../../components/UI/Badge";
import Button from "../../components/UI/Button";
import ButtonPrimary from "../../components/ButtonPrimary";
import { useToast } from "../../components/UI/Toast";
import { SkeletonTitle, SkeletonList } from "../../components/UI/Skeleton";
import EmptyState from "../../components/UI/EmptyState";
import { Calendar, Printer, Clock, MapPin, User, CalendarPlus, MessageSquare, X as XIcon } from "lucide-react";
import {
  SESSION_STATUS,
  SESSION_STATUS_LABEL,
  SESSION_STATUS_VARIANT,
  SESSION_MODALITY_LABEL,
} from "../../utils/constants";
import RequestAppointmentModal from "../../components/patient/RequestAppointmentModal";
import "./pdf.css";

function requestStatusBadge(status) {
  switch (status) {
    case "PENDING": return { variant: "warning", label: "Pendiente" };
    case "ACCEPTED": return { variant: "success", label: "Aceptada" };
    case "DECLINED": return { variant: "danger", label: "Rechazada" };
    case "CANCELLED": return { variant: "neutral", label: "Cancelada" };
    default: return { variant: "neutral", label: status };
  }
}

function modalityLabel(m) {
  if (m === "PRESENCIAL") return "Presencial";
  if (m === "VIRTUAL") return "Virtual";
  return SESSION_MODALITY_LABEL[m] || m || "—";
}

export default function PatientSessions() {
  const { user } = useOutletContext() ?? {};
  const toast = useToast();
  const patientId = user?.patientId || user?.id;

  const [sessions, setSessions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState("");
  const [cancellingSessionId, setCancellingSessionId] = useState("");

  const load = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const [sessionsResp, requestsResp] = await Promise.all([
        listSessionsByPatient(patientId),
        appointmentRequestsService.listForPatient(patientId).catch(() => []),
      ]);
      const items = Array.isArray(sessionsResp) ? sessionsResp : (sessionsResp?.items || []);
      setSessions(items);
      setRequests(requestsResp || []);
    } catch {
      toast.error("No pudimos cargar tus sesiones.");
    } finally {
      setLoading(false);
    }
    // toast es estable (referencia del contexto), no causa re-creación útil
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await load();
    })();
    return () => { alive = false; };
  }, [load]);

  const handleCancelRequest = async (id) => {
    if (!window.confirm("¿Cancelar esta solicitud de cita?")) return;
    setCancellingId(id);
    try {
      await appointmentRequestsService.cancel(id);
      toast.success("Solicitud cancelada.");
      await load();
    } catch (err) {
      toast.error(err?.message || "No pudimos cancelar.");
    } finally {
      setCancellingId("");
    }
  };

  const handleCancelSession = async (sessionId) => {
    if (!window.confirm("¿Cancelar esta cita confirmada? Tu terapeuta será notificado.")) return;
    setCancellingSessionId(sessionId);
    try {
      await changeStatus(sessionId, "CANCELLED");
      toast.success("Cita cancelada.");
      await load();
    } catch (err) {
      toast.error(err?.message || "No pudimos cancelar la cita.");
    } finally {
      setCancellingSessionId("");
    }
  };

  const handleRescheduleSession = () => {
    setRequestModalOpen(true);
  };

  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const respondedRequests = requests.filter((r) => r.status !== "PENDING");

  const sessionDate = (s) => s.datetime || s.scheduledAt || s.time;

  // Filtrado de sesiones por estado temporal
  const upcomingSessions = sessions.filter(s =>
    s.status === SESSION_STATUS.PROGRAMADA || s.status === SESSION_STATUS.CONFIRMADA
  );

  const pastSessions = sessions.filter(s =>
    s.status !== SESSION_STATUS.PROGRAMADA && s.status !== SESSION_STATUS.CONFIRMADA
  );

  const hasAnyContent = sessions.length > 0 || requests.length > 0;

  if (loading) {
    return (
      <section className="page stack-5">
        <SkeletonTitle />
        <SkeletonList count={3} />
      </section>
    );
  }

  return (
    <section className="page stack-5 print-container">
      {/* CABECERA TÉCNICA: Solo se activa en el PDF  */}
      <div className="show-only-print">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '24pt', margin: 0 }}>AGENDA DE SESIONES</h1>
          <p style={{ fontSize: '12pt', color: '#666' }}>Plataforma Clínica ROMI Clínica</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '1rem' }}>
          <span><strong>Paciente:</strong> {user?.firstName} {user?.lastName}</span>
          <span><strong>Fecha de Reporte:</strong> {new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* HEADER DE PANTALLA: Se oculta al imprimir [cite: 18] */}
      <div className="page__header cluster no-print" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div className="stack-2">
          <h1>Mis Sesiones</h1>
          <p className="helper-text">Gestiona tus próximas citas, solicita nuevas y revisa tu historial.</p>
        </div>
        <div className="cluster gap-2">
          <ButtonPrimary onClick={() => setRequestModalOpen(true)}>
            <CalendarPlus size={16} aria-hidden="true" style={{ marginRight: 6 }} />
            Solicitar nueva cita
          </ButtonPrimary>
          <button className="button button--ghost" onClick={() => window.print()} type="button">
            <Printer size={18} />
            <span className="hide-mobile">Imprimir Agenda</span>
          </button>
        </div>
      </div>

      {!hasAnyContent ? (
        <Card hoverable={false} className="no-print">
          <CardBody>
            <EmptyState
              icon={Calendar}
              title="Aún no tienes sesiones"
              message="Cuando tu profesional de salud programe una cita, o cuando tú solicites una, aparecerá aquí."
              action={
                <ButtonPrimary onClick={() => setRequestModalOpen(true)}>
                  <CalendarPlus size={16} aria-hidden="true" style={{ marginRight: 6 }} />
                  Solicitar mi primera cita
                </ButtonPrimary>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="stack-6">
          {/* SECCIÓN: SOLICITUDES PENDIENTES */}
          {pendingRequests.length > 0 && (
            <div className="stack-3 no-print">
              <h2 className="cluster">
                <MessageSquare size={20} color="var(--warning, #d97706)" /> Solicitudes pendientes ({pendingRequests.length})
              </h2>
              <div className="stack-2">
                {pendingRequests.map((req) => {
                  const st = requestStatusBadge(req.status);
                  return (
                    <Card key={req.id} hoverable={false}>
                      <CardBody>
                        <div className="cluster" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
                          <div className="stack-1" style={{ flex: "1 1 280px" }}>
                            <strong className="text-lg">{formatDateISOToHuman(req.requestedAt)}</strong>
                            <div className="cluster gap-2" style={{ flexWrap: "wrap" }}>
                              <Badge variant={st.variant}>{st.label}</Badge>
                              <span className="helper-text">{modalityLabel(req.modality)}</span>
                              <span className="helper-text">· con {req.professionalName}</span>
                            </div>
                            {req.reason && (
                              <p className="helper-text" style={{ marginTop: "0.4rem" }}>
                                <em>“{req.reason}”</em>
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelRequest(req.id)}
                            loading={cancellingId === req.id}
                          >
                            <XIcon size={14} aria-hidden="true" style={{ marginRight: 4 }} />
                            Cancelar
                          </Button>
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECCIÓN: HISTORIAL DE SOLICITUDES (aceptadas / rechazadas / canceladas) */}
          {respondedRequests.length > 0 && (
            <details className="stack-3 no-print" style={{ background: "var(--surface)", borderRadius: "12px", padding: "1rem" }}>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                Historial de solicitudes ({respondedRequests.length})
              </summary>
              <div className="stack-2" style={{ marginTop: "0.75rem" }}>
                {respondedRequests.map((req) => {
                  const st = requestStatusBadge(req.status);
                  return (
                    <div key={req.id} className="cluster" style={{ justifyContent: "space-between", padding: "0.5rem 0", borderTop: "1px solid var(--border)" }}>
                      <div className="stack-0">
                        <span><strong>{formatDateISOToHuman(req.requestedAt)}</strong> · {modalityLabel(req.modality)}</span>
                        {req.responseMessage && (
                          <small className="helper-text">Respuesta: {req.responseMessage}</small>
                        )}
                      </div>
                      <Badge variant={st.variant} size="sm">{st.label}</Badge>
                    </div>
                  );
                })}
              </div>
            </details>
          )}

          {/* SECCIÓN: PRÓXIMAS CITAS */}
          {upcomingSessions.length > 0 && (
            <div className="stack-3 print-section">
              <h2 className="cluster no-print">
                <Clock size={20} color="var(--primary)" /> Próximas Citas
              </h2>
              <div className="grid-print">
                {upcomingSessions.map(session => (
                  <Card key={session.id} className="print-card border-accent">
                    <CardHeader className="cluster-print" style={{ justifyContent: 'space-between' }}>
                      <div className="stack-1">
                        <strong className="print-date text-lg">
                          {formatDateISOToHuman(sessionDate(session))}
                        </strong>
                        <div className="cluster gap-1 helper-text print-subtitle">
                          <MapPin size={14} className="no-print" />
                          {modalityLabel(session.modality)}
                        </div>
                      </div>
                      <div className="print-badge-container">
                        <Badge variant={SESSION_STATUS_VARIANT[session.status]}>
                          {SESSION_STATUS_LABEL[session.status]}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardBody className="stack-3 print-body">
                      <p className="print-info">
                        <User size={16} className="no-print inline-icon" />
                        <strong>Especialista:</strong> {session.professionalName || session.professional?.name || "—"}
                      </p>
                      {session.notes && (
                        <div className="print-notes-box">
                          <p className="helper-text"><strong>Notas:</strong> {session.notes}</p>
                        </div>
                      )}
                      <div className="cluster gap-2 no-print" style={{ marginTop: '0.75rem', flexWrap: 'wrap' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRescheduleSession}
                        >
                          <CalendarPlus size={14} aria-hidden="true" style={{ marginRight: 4 }} />
                          Reagendar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelSession(session.id)}
                          loading={cancellingSessionId === session.id}
                        >
                          <XIcon size={14} aria-hidden="true" style={{ marginRight: 4 }} />
                          Cancelar cita
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* SECCIÓN: HISTORIAL */}
          {pastSessions.length > 0 && (
            <div className="stack-3 print-section">
              <h2 className="helper-text print-title-past">Historial de Sesiones</h2>
              <div className="stack-2">
                {pastSessions.map(session => (
                  <Card key={session.id} hoverable={false} className="card--sm print-card-mini">
                    <CardBody className="cluster-print" style={{ justifyContent: 'space-between' }}>
                      <div className="cluster gap-4 print-data-row">
                        <div className="stack-0">
                          <strong className="print-main-text">
                            {new Date(sessionDate(session)).toLocaleDateString()}
                          </strong>
                          <span className="helper-text small no-print">
                            {new Date(sessionDate(session)).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <div className="stack-0">
                          <span className="text-sm print-secondary-text">
                            {session.professionalName || session.professional?.name || "—"}
                          </span>
                          <span className="helper-text small print-sub-text">
                            {modalityLabel(session.modality)}
                          </span>
                        </div>
                      </div>
                      <div className="print-status-label">
                         <Badge variant={SESSION_STATUS_VARIANT[session.status]} size="sm">
                            {SESSION_STATUS_LABEL[session.status]}
                         </Badge>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PIE DE PÁGINA: Solo en PDF [cite: 31, 34] */}
      <footer className="show-only-print" style={{ marginTop: '3rem', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
        <p style={{ fontSize: '9pt', color: '#999' }}>
          Documento generado automáticamente por ROMI Clínica.
          Válido para fines informativos del paciente.
        </p>
      </footer>

      <RequestAppointmentModal
        open={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        professionalName={sessions[0]?.professionalName || requests[0]?.professionalName}
        onSuccess={() => load()}
      />
    </section>
  );
}