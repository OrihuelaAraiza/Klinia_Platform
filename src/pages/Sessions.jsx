import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import Drawer from "../components/UI/Drawer";
import Modal from "../components/UI/Modal";
import Button from "../components/UI/Button";
import Badge from "../components/UI/Badge";
import Table, { TableEmpty } from "../components/UI/Table";
import SessionForm from "../components/SessionForm";
import SessionRowActions from "../components/SessionRowActions";
import LinkNoteDialog from "../components/LinkNoteDialog";
import InputField from "../components/InputField";
import Field from "../components/UI/Field";
import SessionMiniCalendar from "../components/SessionMiniCalendar";
import { useToast } from "../components/UI/Toast";
import auditService from "../services/auditService";
import { listSessions, createSession, changeStatus, exportIcs } from "../services/sessionsService";
import { ROUTES, SESSION_STATUS, SESSION_STATUS_LABEL, SESSION_STATUS_VARIANT } from "../utils/constants";
import {
  formatSessionModality,
  getSessionPatientName,
  getSessionNoteLabel,
  isSessionNoteDisabled,
} from "../utils/sessionHelpers";

const STATUS_OPTIONS = [
  { label: "Todos", value: "" },
  { label: SESSION_STATUS_LABEL[SESSION_STATUS.PROGRAMADA], value: SESSION_STATUS.PROGRAMADA },
  { label: SESSION_STATUS_LABEL[SESSION_STATUS.CONFIRMADA], value: SESSION_STATUS.CONFIRMADA },
  { label: SESSION_STATUS_LABEL[SESSION_STATUS.ATENDIDA], value: SESSION_STATUS.ATENDIDA },
  { label: SESSION_STATUS_LABEL[SESSION_STATUS.NO_PRESENTADA], value: SESSION_STATUS.NO_PRESENTADA },
  { label: SESSION_STATUS_LABEL[SESSION_STATUS.CANCELADA], value: SESSION_STATUS.CANCELADA },
];

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDayRange(reference = new Date()) {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return {
    key: start.toISOString().slice(0, 10),
    from: start.toISOString(),
    to: end.toISOString(),
  };
}


export default function Sessions() {
  const toast = useToast();
  const navigate = useNavigate();
  const { role, user } = useOutletContext() ?? {};
  const isAssistant = role === "ASSISTANT";

  const professional = useMemo(
    () => ({
      id: user?.id || "",
      name: user?.name || "Profesional Klinia",
      license: user?.license,
    }),
    [user]
  );

  const [filters, setFilters] = useState({ q: "", from: "", to: "", status: "" });
  const [query, setQuery] = useState(filters);
  const [listState, setListState] = useState({ items: [], page: 1, size: 10, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState({});
  const [dialogSession, setDialogSession] = useState(null);
  const [pendingNoteSession, setPendingNoteSession] = useState(null);
  const [calendarSelection, setCalendarSelection] = useState("");
  const [todaySessions, setTodaySessions] = useState([]);
  const [todayLoading, setTodayLoading] = useState(true);
  const [todayError, setTodayError] = useState("");
  const [icsLoading, setIcsLoading] = useState("");
  const refreshTodaySessions = useCallback(async () => {
    setTodayLoading(true);
    setTodayError("");
    try {
      const { from, to } = getDayRange(new Date());
      const response = await listSessions({ from, to, size: 50 });
      const items = Array.isArray(response.items) ? response.items : response;
      setTodaySessions(items || []);
      auditService.logAudit("sessions_list", { preset: "today" });
    } catch (err) {
      setTodayError(err?.message || "No pudimos cargar las sesiones de hoy.");
    } finally {
      setTodayLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function loadSessions() {
      setLoading(true);
      setError("");
      try {
        const response = await listSessions(query);
        if (!active) return;
        setListState({
          items: Array.isArray(response.items) ? response.items : response,
          page: Number(response.page ?? 1),
          size: Number(response.size ?? 10),
          total: Number(response.total ?? response.items?.length ?? 0),
        });
        auditService.logAudit("sessions_list", { filters: query });
      } catch (err) {
        if (!active) return;
        const message = err?.message || "No pudimos cargar la agenda.";
        setError(message);
        toast.error(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadSessions();
    return () => {
      active = false;
    };
  }, [query, toast]);

  useEffect(() => {
    refreshTodaySessions();
  }, [refreshTodaySessions]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilterSubmit = (event) => {
    event.preventDefault();
    setQuery(filters);
  };

  const handleFilterReset = () => {
    setFilters({ q: "", from: "", to: "", status: "" });
    setQuery({ q: "", from: "", to: "", status: "" });
    setCalendarSelection("");
  };

  const handleCreateSession = async (payload) => {
    try {
      const session = await createSession(payload);
      toast.success("Sesión creada");
      auditService.logAudit("session_create", { patientId: session.patientId, sessionId: session.id });
      setDrawerOpen(false);
      setQuery((prev) => ({ ...prev }));
      refreshTodaySessions();
    } catch (err) {
      toast.error(err?.message || "No pudimos crear la sesión.");
      throw err;
    }
  };

  const updateSessionInState = (sessionId, updater) => {
    setListState((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === sessionId ? { ...item, ...updater(item) } : item)),
    }));
  };

  const updateTodaySession = (sessionId, updater) => {
    setTodaySessions((prev) =>
      prev.map((item) => (item.id === sessionId ? { ...item, ...updater(item) } : item))
    );
  };

  const handleStatusChange = async (session, nextStatus) => {
    setStatusLoading({ sessionId: session.id, status: nextStatus });
    try {
      const response = await changeStatus(session.id, nextStatus);
      const updated = response || { ...session, status: nextStatus, updatedAt: new Date().toISOString() };
      updateSessionInState(session.id, () => updated);
       updateTodaySession(session.id, () => updated);
      toast.success(`Sesión ${SESSION_STATUS_LABEL[nextStatus] || nextStatus}`);
      auditService.logAudit("session_status_change", {
        sessionId: session.id,
        status: nextStatus,
        patientId: session.patientId,
      });
      if (nextStatus === SESSION_STATUS.ATENDIDA && !session.noteId) {
        setPendingNoteSession({ ...session, ...updated });
      }
      refreshTodaySessions();
    } catch (err) {
      toast.error(err?.message || "No pudimos actualizar el estado.");
    } finally {
      setStatusLoading({});
    }
  };

  const handleAutocreateNote = async () => {
    if (!pendingNoteSession) return;
    setDialogSession(pendingNoteSession);
    setPendingNoteSession(null);
  };

  const handleDeclineNote = () => {
    setPendingNoteSession(null);
  };

  const handleNoteLinked = (noteId, note) => {
    if (!dialogSession) return;
    updateSessionInState(dialogSession.id, () => ({ noteId, note }));
    updateTodaySession(dialogSession.id, () => ({ noteId, note }));
  };

  const handleLinkDirect = async (session) => {
    if (session.noteId) {
      navigate(`/patients/${session.patientId}/notes/${session.noteId}`);
      return;
    }
    setDialogSession(session);
  };

  const handleExportIcs = async (sessionId) => {
    setIcsLoading(sessionId);
    try {
      await exportIcs(sessionId);
      toast.success("Descarga lista (.ics)");
      auditService.logAudit("session_export_ics", { sessionId });
    } catch (err) {
      toast.error(err?.message || "No pudimos generar el calendario.");
    } finally {
      setIcsLoading("");
    }
  };

  const handleCalendarSelect = (dateKey) => {
    if (!dateKey) {
      return;
    }
    if (calendarSelection === dateKey) {
      setCalendarSelection("");
      setFilters((prev) => ({ ...prev, from: "", to: "" }));
      setQuery((prev) => ({ ...prev, from: "", to: "" }));
      return;
    }
    setCalendarSelection(dateKey);
    setFilters((prev) => ({ ...prev, from: dateKey, to: dateKey }));
    setQuery((prev) => ({ ...prev, from: dateKey, to: dateKey }));
  };

  const rows = listState.items;

  return (
    <section className="page stack-5">
      <div className="page-header sessions-header">
        <div className="sessions-header__intro">
          <h1>Sesiones y agenda</h1>
          <p className="sessions-header__subtitle">
            Administra sesiones programadas, confirma asistencia y vincula notas clínicas.
          </p>
        </div>
        <div className="sessions-header__actions">
          <Button variant="secondary" size="sm" onClick={() => navigate(ROUTES.sessionsCalendar)}>
            Vista calendario
          </Button>
          {!isAssistant ? (
            <Button size="sm" onClick={() => setDrawerOpen(true)}>
              Nueva sesión
            </Button>
          ) : null}
        </div>
      </div>

      <section className="sessions-today">
        <div className="sessions-today__header">
          <div>
            <h2>Sesiones de hoy</h2>
            <p className="sessions-today__subtitle">Seguimiento rápido de tu agenda diaria.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={refreshTodaySessions} disabled={todayLoading}>
            {todayLoading ? "Actualizando..." : "Actualizar"}
          </Button>
        </div>
        {todayLoading ? (
          <div className="sessions-today__skeleton">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="sessions-today__placeholder" aria-hidden="true" />
            ))}
          </div>
        ) : todaySessions.length === 0 ? (
          <TableEmpty
            title="Sin sesiones para hoy"
            description={todayError || "Programa tu primera sesión para empezar a registrar el seguimiento."}
            action={
              !isAssistant ? (
                <Button size="sm" onClick={() => setDrawerOpen(true)}>
                  Crear primera sesión
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="sessions-today__grid">
            {todaySessions.map((session) => {
              const badgeVariant = SESSION_STATUS_VARIANT[session.status] || "neutral";
              const disabledNote = isSessionNoteDisabled(session, isAssistant);
              return (
                <article key={`today-${session.id}`} className="sessions-today-card">
                  <div className="sessions-today-card__time">
                    <span>{formatTime(session.datetime)}</span>
                    <Badge variant={badgeVariant}>{SESSION_STATUS_LABEL[session.status] || session.status}</Badge>
                  </div>
                  <h3 className="sessions-today-card__title">{getSessionPatientName(session)}</h3>
                  <p className="sessions-today-card__meta">{session.professional?.name || session.professionalName || "—"}</p>
                  <p className="sessions-today-card__submeta">{formatSessionModality(session)}</p>
                  <div className="sessions-today-card__actions">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLinkDirect(session)}
                      disabled={disabledNote}
                    >
                      {getSessionNoteLabel(session, isAssistant)}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExportIcs(session.id)}
                      loading={icsLoading === session.id}
                      title="Descargar evento (.ics)"
                    >
                      .ics
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="sessions-toolbar">
        <form className="sessions-filters" onSubmit={handleFilterSubmit}>
        <div className="sessions-filters__field">
          <InputField
            label="Buscar"
            placeholder="Paciente o profesional"
            name="q"
            value={filters.q}
            onChange={handleFilterChange}
          />
        </div>
        <div className="sessions-filters__field">
          <InputField
            label="Desde"
            type="date"
            name="from"
            value={filters.from}
            onChange={handleFilterChange}
          />
        </div>
        <div className="sessions-filters__field">
          <InputField
            label="Hasta"
            type="date"
            name="to"
            value={filters.to}
            onChange={handleFilterChange}
          />
        </div>
        <div className="sessions-filters__field sessions-filters__field--select">
          <Field label="Estado">
            {({ fieldId }) => (
              <select id={fieldId} name="status" className="role-select" value={filters.status} onChange={handleFilterChange}>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <div className="sessions-filters__actions">
          <Button variant="secondary" type="submit" size="sm" disabled={loading}>
            Filtrar
          </Button>
          <Button variant="ghost" type="button" size="sm" onClick={handleFilterReset}>
            Limpiar
          </Button>
        </div>
      </form>
        <SessionMiniCalendar
          sessions={listState.items}
          selectedDate={calendarSelection}
          onSelectDate={handleCalendarSelect}
        />
      </div>

      <Motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Table density="compact">
          <thead>
            <tr>
              <th>Fecha y hora</th>
              <th>Paciente</th>
              <th>Profesional</th>
              <th>Estado</th>
              <th>Nota</th>
              <th className="align-right">Acciones</th>
            </tr>
          </thead>
            <tbody>
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <TableEmpty
                      title="Sin sesiones registradas"
                      description={error || "Aún no se han agendado sesiones con los filtros aplicados."}
                      action={!isAssistant ? (
                        <Button size="sm" onClick={() => setDrawerOpen(true)}>
                        Crear primera sesión
                        </Button>
                      ) : null}
                    />
                  </td>
                </tr>
              ) : null}
              {rows.map((session) => {
                const badgeVariant = SESSION_STATUS_VARIANT[session.status] || "neutral";
                const isChanging = statusLoading.sessionId === session.id ? statusLoading.status : null;
                const noteDisabled = isSessionNoteDisabled(session, isAssistant);
                return (
                  <tr key={session.id}>
                    <td>
                      <p className="sessions-table__primary">{formatDateTime(session.datetime)}</p>
                      <p className="sessions-table__meta">{formatSessionModality(session)}</p>
                    </td>
                    <td>{getSessionPatientName(session)}</td>
                    <td>{session.professional?.name || session.professionalName || "—"}</td>
                    <td>
                      <Badge variant={badgeVariant}>{SESSION_STATUS_LABEL[session.status] || session.status}</Badge>
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLinkDirect(session)}
                        disabled={noteDisabled}
                      >
                        {getSessionNoteLabel(session, isAssistant)}
                      </Button>
                    </td>
                    <td className="align-right">
                      <div className="session-actions-cell">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExportIcs(session.id)}
                          loading={icsLoading === session.id}
                          title="Descargar evento (.ics)"
                        >
                          .ics
                        </Button>
                        <SessionRowActions
                          session={session}
                          isAssistant={isAssistant}
                          onChangeStatus={(status) => handleStatusChange(session, status)}
                          changing={isChanging}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
        </Table>
      </Motion.div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Programar sesión">
        <SessionForm
          onSubmit={handleCreateSession}
          onCancel={() => setDrawerOpen(false)}
          defaultProfessional={professional.name}
          defaultProfessionalId={professional.id}
        />
      </Drawer>

      <Modal
        open={Boolean(pendingNoteSession)}
        onClose={handleDeclineNote}
        title="Sesión marcada como atendida"
        footer={
          <div className="cluster" style={{ justifyContent: "flex-end" }}>
            <Button variant="ghost" onClick={handleDeclineNote}>
              Más tarde
            </Button>
            <Button onClick={handleAutocreateNote}>
              Crear nota ahora
            </Button>
          </div>
        }
      >
        <p>
          Se registró la sesión de {pendingNoteSession?.patientName || pendingNoteSession?.patient?.name || "la paciente"}. ¿Deseas crear la nota de evolución en este momento?
        </p>
      </Modal>

      <LinkNoteDialog
        open={Boolean(dialogSession)}
        onClose={() => setDialogSession(null)}
        session={dialogSession}
        patient={dialogSession ? { id: dialogSession.patientId } : null}
        professional={professional}
        onLinked={(noteId) => {
          handleNoteLinked(noteId);
          setDialogSession(null);
        }}
      />
    </section>
  );
}
