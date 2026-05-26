import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Inbox, Check, X as XIcon, Clock, UserCheck, UserX, Calendar, LinkIcon } from "lucide-react";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Button from "../components/UI/Button";
import Badge from "../components/UI/Badge";
import Modal from "../components/UI/Modal";
import EmptyState from "../components/UI/EmptyState";
import { SkeletonList } from "../components/UI/Skeleton";
import { useToast } from "../components/UI/Toast";
import linkageRequestsService from "../services/linkageRequestsService";
import appointmentRequestsService from "../services/appointmentRequestsService";
import auditService from "../services/auditService";
import { formatDateISOToHuman } from "../utils/formatters";

const KIND_LINKAGE = "linkage";
const KIND_APPOINTMENT = "appointment";

function appointmentStatusBadge(status) {
  if (status === "PENDING") return { variant: "warning", label: "Pendiente" };
  if (status === "ACCEPTED") return { variant: "success", label: "Aceptada" };
  if (status === "DECLINED") return { variant: "danger", label: "Rechazada" };
  if (status === "CANCELLED") return { variant: "neutral", label: "Cancelada" };
  return { variant: "neutral", label: status };
}

function modalityLabel(m) {
  if (m === "PRESENCIAL") return "Presencial";
  if (m === "VIRTUAL") return "Virtual";
  return m || "—";
}

const TABS = [
  { id: "PENDING", label: "Pendientes", icon: Clock },
  { id: "ACCEPTED", label: "Aceptadas", icon: UserCheck },
  { id: "DECLINED", label: "Rechazadas", icon: UserX },
];

function priorityBadge(priority) {
  if (priority === "primary") return { variant: "success", label: "Opción principal" };
  if (priority === "backup") return { variant: "info", label: "2ª opción" };
  return { variant: "neutral", label: priority || "—" };
}

function statusBadge(status) {
  if (status === "PENDING") return { variant: "warning", label: "Pendiente" };
  if (status === "ACCEPTED") return { variant: "success", label: "Aceptada" };
  if (status === "DECLINED") return { variant: "danger", label: "Rechazada" };
  return { variant: "neutral", label: status };
}

export default function Solicitudes() {
  const navigate = useNavigate();
  const toast = useToast();

  const [kind, setKind] = useState(KIND_LINKAGE);
  const [activeTab, setActiveTab] = useState("PENDING");
  const [items, setItems] = useState([]);
  const [pendingCounts, setPendingCounts] = useState({ linkage: 0, appointment: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [responseModal, setResponseModal] = useState({ open: false, request: null, mode: null, message: "", scheduledAt: "", modality: "PRESENCIAL" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fetcher =
        kind === KIND_APPOINTMENT
          ? appointmentRequestsService.listForProfessional
          : linkageRequestsService.listForProfessional;
      const list = await fetcher({ status: activeTab });
      setItems(list);
    } catch (err) {
      toast.error(err?.message || "No pudimos cargar las solicitudes.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [kind, activeTab, toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Conteo de pendientes en ambos tipos para mostrar el indicador en el segmented
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [lk, apt] = await Promise.all([
          linkageRequestsService.listForProfessional({ status: "PENDING" }).then((x) => x.length).catch(() => 0),
          appointmentRequestsService.listForProfessional({ status: "PENDING" }).then((x) => x.length).catch(() => 0),
        ]);
        if (alive) setPendingCounts({ linkage: lk, appointment: apt });
      } catch {
        // ignore
      }
    })();
    return () => { alive = false; };
  }, [items]);

  const openResponse = (request, mode) => {
    const scheduledAt = request?.requestedAt
      ? new Date(request.requestedAt).toISOString().slice(0, 16)
      : "";
    setResponseModal({
      open: true,
      request,
      mode,
      message: "",
      scheduledAt,
      modality: request?.modality || "PRESENCIAL",
    });
  };

  const closeResponse = () => {
    if (actionLoading) return;
    setResponseModal({ open: false, request: null, mode: null, message: "", scheduledAt: "", modality: "PRESENCIAL" });
  };

  const confirmResponse = async () => {
    const { request, mode, message, scheduledAt, modality } = responseModal;
    if (!request || !mode) return;
    setActionLoading(request.id);
    try {
      if (kind === KIND_APPOINTMENT) {
        if (mode === "accept") {
          await appointmentRequestsService.accept(request.id, {
            scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
            modality,
            message,
          });
          auditService.logAudit("appointment_request_accepted", { requestId: request.id, patientId: request.patientId });
          toast.success(`Cita confirmada con ${request.patientName}.`);
        } else {
          await appointmentRequestsService.decline(request.id, message);
          auditService.logAudit("appointment_request_declined", { requestId: request.id, patientId: request.patientId });
          toast.warn("Solicitud de cita rechazada.");
        }
      } else if (mode === "accept") {
        await linkageRequestsService.accept(request.id, message);
        auditService.logAudit("linkage_request_accepted", { requestId: request.id, patientId: request.patientId });
        toast.success(`Vinculaste a ${request.patientName} a tu lista.`);
      } else {
        await linkageRequestsService.decline(request.id, message);
        auditService.logAudit("linkage_request_declined", { requestId: request.id, patientId: request.patientId });
        toast.warn("Solicitud rechazada.");
      }
      closeResponse();
      load();
    } catch (err) {
      toast.error(err?.message || "No pudimos procesar la solicitud.");
    } finally {
      setActionLoading("");
    }
  };

  const isAppointmentKind = kind === KIND_APPOINTMENT;

  return (
    <section className="page stack-5">
      <header className="page-header">
        <div className="stack-1">
          <h1>Solicitudes</h1>
          <p className="helper-text">
            {isAppointmentKind
              ? "Pacientes que pidieron una nueva cita. Confirma fecha y modalidad o rechaza con un mensaje."
              : "Pacientes que te eligieron desde el directorio público. Revisa el motivo, acepta para vincularlos a tu lista o rechaza con un mensaje."}
          </p>
        </div>
      </header>

      <div className="solicitudes-kind-switch" role="tablist" aria-label="Tipo de solicitud">
        <button
          type="button"
          role="tab"
          aria-selected={!isAppointmentKind}
          className={`solicitudes-kind-pill${!isAppointmentKind ? " is-active" : ""}`}
          onClick={() => setKind(KIND_LINKAGE)}
        >
          <LinkIcon size={14} aria-hidden="true" />
          Vinculación
          {pendingCounts.linkage > 0 ? <span className="solicitudes-kind-pill__count">{pendingCounts.linkage}</span> : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isAppointmentKind}
          className={`solicitudes-kind-pill${isAppointmentKind ? " is-active" : ""}`}
          onClick={() => setKind(KIND_APPOINTMENT)}
        >
          <Calendar size={14} aria-hidden="true" />
          Citas
          {pendingCounts.appointment > 0 ? <span className="solicitudes-kind-pill__count">{pendingCounts.appointment}</span> : null}
        </button>
      </div>

      <Card hoverable={false}>
        <CardBody className="stack-3">
          <div className="solicitudes-tabs" role="tablist">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`solicitudes-tab${activeTab === tab.id ? " is-active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {loading ? (
            <SkeletonList count={3} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={activeTab === "PENDING" ? "No hay solicitudes pendientes" : "Sin elementos"}
              message={
                activeTab === "PENDING"
                  ? isAppointmentKind
                    ? "Cuando un paciente pida una nueva cita, aparecerá aquí para que la confirmes."
                    : "Cuando un paciente te elija desde el directorio público, aparecerá aquí."
                  : "Aún no hay solicitudes en este estado."
              }
            />
          ) : (
            <ul className="solicitud-list" role="list">
              {items.map((req) => {
                const pri = isAppointmentKind ? null : priorityBadge(req.priority);
                const st = isAppointmentKind ? appointmentStatusBadge(req.status) : statusBadge(req.status);
                return (
                  <li key={req.id} className="solicitud-item">
                    <div className="solicitud-item__main">
                      <div className="cluster gap-2 align-center wrap">
                        <strong className="solicitud-item__name">{req.patientName}</strong>
                        {pri ? <Badge variant={pri.variant}>{pri.label}</Badge> : null}
                        {isAppointmentKind ? <Badge variant="info">{modalityLabel(req.modality)}</Badge> : null}
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </div>
                      <p className="helper-text" style={{ margin: "0.35rem 0 0" }}>
                        {req.patientEmail ? `${req.patientEmail} · ` : ""}
                        {isAppointmentKind && req.requestedAt
                          ? <>Pidió cita para <strong>{formatDateISOToHuman(req.requestedAt)}</strong> · </>
                          : null}
                        Recibida el {formatDateISOToHuman(req.createdAt)}
                      </p>
                      {req.reason ? (
                        <blockquote className="solicitud-item__reason">
                          “{req.reason}”
                        </blockquote>
                      ) : (
                        <p className="helper-text" style={{ marginTop: 6 }}>El paciente no agregó motivo.</p>
                      )}
                      {req.responseMessage ? (
                        <p className="helper-text" style={{ marginTop: 6 }}>
                          <strong>Tu respuesta:</strong> {req.responseMessage}
                        </p>
                      ) : null}
                    </div>
                    {req.status === "PENDING" ? (
                      <div className="solicitud-item__actions">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => openResponse(req, "accept")}
                        >
                          <Check size={14} aria-hidden="true" style={{ marginRight: 4 }} />
                          Aceptar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openResponse(req, "decline")}
                        >
                          <XIcon size={14} aria-hidden="true" style={{ marginRight: 4 }} />
                          Rechazar
                        </Button>
                      </div>
                    ) : req.status === "ACCEPTED" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          isAppointmentKind
                            ? navigate("/sessions-calendar")
                            : navigate(`/patients/${req.patientId}`)
                        }
                      >
                        {isAppointmentKind ? "Ver agenda" : "Ver expediente"}
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      <Modal
        open={responseModal.open}
        onClose={closeResponse}
        title={
          responseModal.mode === "accept"
            ? isAppointmentKind ? "Confirmar cita" : "Aceptar solicitud"
            : "Rechazar solicitud"
        }
        footer={
          <div className="cluster">
            <Button variant="ghost" onClick={closeResponse} disabled={Boolean(actionLoading)}>
              Cancelar
            </Button>
            <Button
              variant={responseModal.mode === "accept" ? "primary" : "danger"}
              onClick={confirmResponse}
              loading={Boolean(actionLoading)}
            >
              {responseModal.mode === "accept"
                ? isAppointmentKind ? "Confirmar cita" : "Aceptar y vincular"
                : "Rechazar"}
            </Button>
          </div>
        }
      >
        <div className="stack-3">
          <p>
            {responseModal.mode === "accept" ? (
              isAppointmentKind ? (
                <>
                  Vas a confirmar la cita de <strong>{responseModal.request?.patientName}</strong>.
                  Se creará una sesión en tu agenda con los datos que confirmes a continuación.
                </>
              ) : (
                <>
                  Vas a aceptar la solicitud de <strong>{responseModal.request?.patientName}</strong>.
                  Quedará vinculado a tu lista y podrás comenzar a agendar sesiones.
                </>
              )
            ) : isAppointmentKind ? (
              <>
                Vas a rechazar la solicitud de cita de <strong>{responseModal.request?.patientName}</strong>.
                Puedes incluir un mensaje proponiendo otra fecha o modalidad.
              </>
            ) : (
              <>
                Vas a rechazar la solicitud de <strong>{responseModal.request?.patientName}</strong>.
                Si el paciente registró una 2ª opción, será considerada con ese terapeuta.
              </>
            )}
          </p>

          {isAppointmentKind && responseModal.mode === "accept" ? (
            <div className="form-grid">
              <div className="stack-1">
                <label className="ui-field__label">Fecha y hora confirmada</label>
                <input
                  type="datetime-local"
                  className="input-field__input"
                  value={responseModal.scheduledAt}
                  onChange={(e) => setResponseModal((m) => ({ ...m, scheduledAt: e.target.value }))}
                />
              </div>
              <div className="stack-1">
                <label className="ui-field__label">Modalidad</label>
                <select
                  className="input-field__input"
                  value={responseModal.modality}
                  onChange={(e) => setResponseModal((m) => ({ ...m, modality: e.target.value }))}
                >
                  <option value="PRESENCIAL">Presencial</option>
                  <option value="VIRTUAL">Virtual</option>
                </select>
              </div>
            </div>
          ) : null}

          <div className="stack-1">
            <label className="ui-field__label">
              {responseModal.mode === "accept" ? "Mensaje opcional al paciente" : "Mensaje al paciente"}
            </label>
            <textarea
              className="input-field__input"
              rows={3}
              value={responseModal.message}
              onChange={(e) => setResponseModal((m) => ({ ...m, message: e.target.value }))}
              placeholder={
                responseModal.mode === "accept"
                  ? isAppointmentKind
                    ? "Ej. Confirmada para el martes. Si necesitas reagendar, escríbeme."
                    : "Ej. Encantada de acompañarte. Te contactaré en las próximas 24 horas."
                  : isAppointmentKind
                    ? "Ej. Esa hora no tengo disponibilidad. ¿Te funciona el jueves a las 5pm?"
                    : "Ej. En este momento mi agenda está completa. Te sugiero buscar otro especialista."
              }
              maxLength={400}
            />
          </div>
        </div>
      </Modal>
    </section>
  );
}
