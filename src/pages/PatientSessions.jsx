import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import Button from "../components/UI/Button";
import Badge from "../components/UI/Badge";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Drawer from "../components/UI/Drawer";
import Modal from "../components/UI/Modal";
import Table, { TableEmpty } from "../components/UI/Table";
import SessionForm from "../components/SessionForm";
import SessionRowActions from "../components/SessionRowActions";
import LinkNoteDialog from "../components/LinkNoteDialog";
import { useToast } from "../components/UI/Toast";
import auditService from "../services/auditService";
import { getPatient } from "../services/patientsService";
import {
  listSessionsByPatient,
  createSession,
  changeStatus,
} from "../services/sessionsService";
import { SESSION_STATUS, SESSION_STATUS_LABEL, SESSION_STATUS_VARIANT } from "../utils/constants";
import {
  formatSessionModality,
  getSessionNoteLabel,
  isSessionNoteDisabled,
} from "../utils/sessionHelpers";

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function PatientSessions() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { role, user } = useOutletContext() ?? {};
  const isAssistant = role === "ASSISTANT";

  const professional = useMemo(
    () => ({
      id: user?.id || "user",
      name: user?.name || "Profesional BreveMente",
      license: user?.license,
    }),
    [user]
  );

  const [patient, setPatient] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState({});
  const [noteDialogSession, setNoteDialogSession] = useState(null);
  const [pendingNoteSession, setPendingNoteSession] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [patientResponse, sessionsResponse] = await Promise.all([
          getPatient(id),
          listSessionsByPatient(id, { size: 50 }),
        ]);
        if (!active) return;
        setPatient(patientResponse);
        const items = Array.isArray(sessionsResponse?.items) ? sessionsResponse.items : sessionsResponse;
        setSessions(items || []);
        auditService.logAudit("sessions_list", { patientId: id });
      } catch (err) {
        if (!active) return;
        const message = err?.message || "No pudimos cargar las sesiones del paciente.";
        setError(message);
        toast.error(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [id, toast]);

  const handleCreate = async (payload) => {
    try {
      const session = await createSession({ ...payload, patientId: id });
      setSessions((prev) => [session, ...prev]);
      auditService.logAudit("session_create", { patientId: id, sessionId: session.id });
      toast.success("Sesión creada");
      setDrawerOpen(false);
    } catch (err) {
      toast.error(err?.message || "No pudimos crear la sesión.");
      throw err;
    }
  };

  const updateSession = (sessionId, updater) => {
    setSessions((prev) => prev.map((item) => (item.id === sessionId ? { ...item, ...updater(item) } : item)));
  };

  const handleStatusChange = async (session, status) => {
    setStatusLoading({ sessionId: session.id, status });
    try {
      const response = await changeStatus(session.id, status);
      const updated = response || { ...session, status, updatedAt: new Date().toISOString() };
      updateSession(session.id, () => updated);
      auditService.logAudit("session_status_change", { sessionId: session.id, patientId: id, status });
      toast.success(`Sesión ${SESSION_STATUS_LABEL[status] || status}`);
      if (status === SESSION_STATUS.ATENDIDA && !session.noteId) {
        setPendingNoteSession({ ...session, ...updated });
      }
    } catch (err) {
      toast.error(err?.message || "No pudimos actualizar la sesión.");
    } finally {
      setStatusLoading({});
    }
  };

  const handleNoteLinked = (noteId, note) => {
    if (!noteDialogSession) return;
    updateSession(noteDialogSession.id, () => ({ noteId, note }));
  };

  const handleViewOrCreateNote = (session) => {
    if (session.noteId) {
      navigate(`/patients/${id}/notes/${session.noteId}`);
      return;
    }
    setNoteDialogSession(session);
  };

  const patientName = patient ? `${patient.firstName || ""} ${patient.lastName || ""}`.trim() || patient.curp : "Paciente";

  return (
    <section className="page stack-5">
      <Card hoverable={false}>
        <CardHeader>
          <div className="stack-1">
            <h1>Sesiones de {patientName}</h1>
            <p className="helper-text">Gestiona la agenda de este paciente y registra el seguimiento clínico.</p>
          </div>
          {!isAssistant ? (
            <Button onClick={() => setDrawerOpen(true)}>Nueva sesión</Button>
          ) : null}
        </CardHeader>
      </Card>

      <Card hoverable={false}>
        <CardBody className="stack-3">
          <Table density="compact">
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Duración</th>
                <th>Estado</th>
                <th>Nota</th>
                <th className="align-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {!loading && sessions.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <TableEmpty
                      title="Sin sesiones registradas"
                      description={error || "Aún no se han programado sesiones para este paciente."}
                      action={!isAssistant ? (
                        <Button size="sm" onClick={() => setDrawerOpen(true)}>
                          Crear primera sesión
                        </Button>
                      ) : null}
                    />
                  </td>
                </tr>
              ) : null}
              {sessions.map((session) => {
                const badgeVariant = SESSION_STATUS_VARIANT[session.status] || "neutral";
                const isChanging = statusLoading.sessionId === session.id ? statusLoading.status : null;
                const noteDisabled = isSessionNoteDisabled(session, isAssistant);
                return (
                  <tr key={session.id}>
                    <td>
                      <p className="sessions-table__primary">{formatDateTime(session.datetime)}</p>
                      <p className="sessions-table__meta">{formatSessionModality(session)}</p>
                    </td>
                    <td>{session.durationMin ? `${session.durationMin} min` : "—"}</td>
                    <td>
                      <Badge variant={badgeVariant}>{SESSION_STATUS_LABEL[session.status] || session.status}</Badge>
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewOrCreateNote(session)}
                        disabled={noteDisabled}
                      >
                        {getSessionNoteLabel(session, isAssistant)}
                      </Button>
                    </td>
                    <td className="align-right">
                      <SessionRowActions
                        session={session}
                        isAssistant={isAssistant}
                        onChangeStatus={(status) => handleStatusChange(session, status)}
                        changing={isChanging}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Programar sesión">
        <SessionForm
          onSubmit={handleCreate}
          onCancel={() => setDrawerOpen(false)}
          defaultProfessional={professional.name}
          defaultProfessionalId={professional.id}
          presetPatientId={id}
        />
      </Drawer>

      <Modal
        open={Boolean(pendingNoteSession)}
        onClose={() => setPendingNoteSession(null)}
        title="Sesión atendida"
        footer={
          <div className="cluster" style={{ justifyContent: "flex-end" }}>
            <Button variant="ghost" onClick={() => setPendingNoteSession(null)}>
              Más tarde
            </Button>
            <Button onClick={() => {
              setNoteDialogSession(pendingNoteSession);
              setPendingNoteSession(null);
            }}>
              Crear nota ahora
            </Button>
          </div>
        }
      >
        <p>La sesión se marcó como atendida. ¿Deseas registrar la nota de evolución?</p>
      </Modal>

      <LinkNoteDialog
        open={Boolean(noteDialogSession)}
        onClose={() => setNoteDialogSession(null)}
        session={noteDialogSession}
        patient={noteDialogSession ? { id } : null}
        professional={professional}
        onLinked={(noteId) => {
          handleNoteLinked(noteId);
          setNoteDialogSession(null);
        }}
      />
    </section>
  );
}
