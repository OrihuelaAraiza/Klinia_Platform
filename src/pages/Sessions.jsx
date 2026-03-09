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
import InputField from "../components/InputField";
import Field from "../components/UI/Field";
import SessionMiniCalendar from "../components/SessionMiniCalendar";
import SessionDetailDrawer from "../components/SessionDetailDrawer";
import { useToast } from "../components/UI/Toast";
import auditService from "../services/auditService";
import { listSessions, createSession, exportIcs } from "../services/sessionsService";
import { createPatient, listPatients } from "../services/patientsService";
import { ROUTES, SESSION_STATUS, SESSION_STATUS_LABEL, SESSION_STATUS_VARIANT } from "../utils/constants";
import {
    formatSessionModality,
    getSessionPatientName,
    getSessionNoteLabel,
} from "../utils/sessionHelpers";


const STATUS_OPTIONS = [
    { label: "Todos", value: "" },
    { label: SESSION_STATUS_LABEL[SESSION_STATUS.PROGRAMADA], value: SESSION_STATUS.PROGRAMADA },
    { label: SESSION_STATUS_LABEL[SESSION_STATUS.ATENDIDA], value: SESSION_STATUS.ATENDIDA },
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

function getDateRangeISO(dateKey, isStart = true) {
    if (!dateKey) return null;
    let date;
    if (isStart) {
        date = new Date(`${dateKey}T00:00:00`);
    } else {
        date = new Date(`${dateKey}T23:59:59`);
        date.setMilliseconds(999);
    }
    return date.toISOString();
}

function buildPreRegisteredPatientPayload(candidate = {}, professionalId = "") {
    const now = new Date();
    const fallbackDate = `${Math.max(1900, now.getFullYear() - 18)}-01-01`;
    const firstName = candidate.firstName?.trim() || "Paciente";
    const lastName = candidate.lastName?.trim() || "Por Registrar";
    const phone = candidate.phone?.trim() || "0000000000";
    const fallbackEmail = `preregistro+${Date.now()}@brevemente.local`;

    return {
        firstName,
        lastName,
        curp: "",
        birthDate: fallbackDate,
        gender: "X",
        genderIdentity: "",
        phone,
        email: candidate.email?.trim() || fallbackEmail,
        homePhone: "",
        workPhone: "",
        street: "Pendiente por registrar",
        postalCode: "00000",
        neighborhood: "Pendiente",
        state: "Pendiente",
        municipality: "Pendiente",
        city: "Pendiente",
        rfc: "",
        nationality: "Mexicana",
        occupation: "",
        civilStatus: "",
        religion: "",
        education: "",
        emergencyName: `${firstName} ${lastName}`.trim(),
        emergencyPhone: phone,
        emergencyRelation: "Pendiente",
        legalGuardianName: "",
        legalGuardianRelation: "",
        legalGuardianPhone: "",
        referral: "Agenda",
        purpose: "Registro iniciado desde agenda",
        professionalId,
        attachments: [],
    };
}


export default function Sessions() {
    const toast = useToast();
    const navigate = useNavigate();
    const { role, user } = useOutletContext() ?? {};
    const isAssistant = role === "ASSISTANT";
    const professionalId = user?.therapistId || user?.id || "";

    const [selectedSessionId, setSelectedSessionId] = useState(null);

    const professional = useMemo(
        () => ({
            id: professionalId,
            name: user?.name || "Profesional BreveMente",
            license: user?.license,
        }),
        [user, professionalId]
    );

    const [filters, setFilters] = useState({ q: "", from: "", to: "", status: "" });
    const [query, setQuery] = useState(filters);
    const [listState, setListState] = useState({ items: [], page: 1, size: 10, total: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [pendingNoteSession, setPendingNoteSession] = useState(null);
    const [calendarSelection, setCalendarSelection] = useState("");
    const [todaySessions, setTodaySessions] = useState([]);
    const [todayLoading, setTodayLoading] = useState(true);
    const [todayError, setTodayError] = useState("");
    const [icsLoading, setIcsLoading] = useState("");
    const [professionalPatients, setProfessionalPatients] = useState([]);


    const refreshTodaySessions = useCallback(async () => {
        if (!professionalId) return;

        setTodayLoading(true);
        setTodayError("");
        try {
            const { from, to } = getDayRange(new Date());
            const response = await listSessions({ from, to, size: 50, professionalId });

            const items = Array.isArray(response.items) ? response.items : response;
            setTodaySessions(items || []);
            auditService.logAudit("sessions_list", { preset: "today" });
        } catch (err) {
            setTodayError(err?.message || "No pudimos cargar las sesiones de hoy.");
        } finally {
            setTodayLoading(false);
        }
    }, [professionalId]);


    useEffect(() => {
        let active = true;

        async function loadSessions() {
            if (!professionalId) return;

            setLoading(true);
            setError("");
            try {
                const queryWithRange = { ...query };
                if (query.from) {
                    queryWithRange.from = getDateRangeISO(query.from, true);
                }
                if (query.to) {
                    queryWithRange.to = getDateRangeISO(query.to, false);
                }

                const response = await listSessions({ ...queryWithRange, professionalId: professionalId });

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
    }, [query, toast, professionalId]);


    useEffect(() => {
        if (professionalId) {
            refreshTodaySessions();
        }
    }, [refreshTodaySessions, professionalId]);

    useEffect(() => {
        let active = true;
        async function loadProfessionalPatients() {
            if (!professionalId) return;
            try {
                const response = await listPatients({
                    professionalId,
                    page: 1,
                    size: 500,
                });
                if (!active) return;
                const items = Array.isArray(response?.items) ? response.items : response;
                setProfessionalPatients(items || []);
            } catch (err) {
                if (!active) return;
                toast.error(err?.message || "No pudimos cargar pacientes para búsqueda.");
            }
        }
        loadProfessionalPatients();
        return () => {
            active = false;
        };
    }, [professionalId, toast]);

    useEffect(() => {
        const debounce = setTimeout(() => {
            setQuery((prev) => ({ ...prev, q: filters.q.trim() }));
        }, 250);

        return () => clearTimeout(debounce);
    }, [filters.q]);

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
            let finalPayload = {
                ...payload,
                professionalId: professionalId,
            };

            if (!finalPayload.patientId && payload?.patientMode === "unregistered") {
                const patientPayload = buildPreRegisteredPatientPayload(
                    payload?.unregisteredPatient,
                    professionalId
                );

                const createdPatient = await createPatient(patientPayload);
                const createdPatientName = `${createdPatient?.firstName || ""} ${createdPatient?.lastName || ""}`.trim();
                const preRegNote = `Pre-registro creado desde Agenda.`;
                finalPayload = {
                    ...finalPayload,
                    patientId: createdPatient?.id,
                    patientName: createdPatientName || undefined,
                    notes: [preRegNote, finalPayload.notes].filter(Boolean).join(" "),
                };
                toast.success("Paciente pre-registrado y sesión agendada.");
            }

            const session = await createSession(finalPayload);
            toast.success("Sesión creada");

            auditService.logAudit("session_create", {
                patientId: session.patientId,
                sessionId: session.id,
                executorId: user.id
            });

            setDrawerOpen(false);
            setQuery((prev) => ({ ...prev }));
            refreshTodaySessions();
        } catch (err) {
            toast.error(err?.message || "No pudimos crear la sesión.");
            throw err;
        }
    };

    const handleStartRegistration = (prefill = {}) => {
        navigate(ROUTES.patients, {
            state: {
                openCreate: true,
                prefillPatient: {
                    firstName: prefill.firstName || "",
                    lastName: prefill.lastName || "",
                    phone: prefill.phone || "",
                    email: prefill.email || "",
                },
                source: "sessions",
            },
        });
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

    const handleAutocreateNote = async () => {
        if (!pendingNoteSession) return;
        const session = pendingNoteSession;
        setPendingNoteSession(null);

        navigate(`${ROUTES.patients}/${session.patientId}/notes`);
    };

    const handleDeclineNote = () => {
        setPendingNoteSession(null);
    };

    const handleLinkDirect = (session) => {
        if (session.noteId) {
            navigate(`${ROUTES.patients}/${session.patientId}/notes/${session.noteId}`);
            return;
        }
        navigate(`${ROUTES.patients}/${session.patientId}/notes`);
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
    const patientSearchOptions = useMemo(() => {
        const queryValue = filters.q.trim().toLowerCase();
        const normalized = professionalPatients.map((patient) => {
            const fullName = `${patient.firstName || ""} ${patient.lastName || ""}`.trim();
            const searchTarget = [fullName, patient.curp, patient.email, patient.phone]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return {
                id: patient.id,
                fullName: fullName || patient.curp || patient.email || patient.phone || patient.id,
                details: [patient.curp, patient.email].filter(Boolean).join(" • "),
                searchTarget,
            };
        });

        if (!queryValue) {
            return normalized.slice(0, 100);
        }
        return normalized.filter((item) => item.searchTarget.includes(queryValue)).slice(0, 100);
    }, [professionalPatients, filters.q]);

    const getFullName = (session) => {
        if (!session) {
            return "—";
        }

        if (session.patientFirstName && session.patientLastName) {
            return `${session.patientFirstName} ${session.patientLastName}`.trim();
        }
        return getSessionPatientName(session);
    }

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
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleStartRegistration()}
                    >
                        Registrar paciente
                    </Button>
                    <Button size="sm" onClick={() => setDrawerOpen(true)}>
                        Nueva sesión
                    </Button>

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
                        description={todayError || "Programa una sesión."}
                        action={
                            <Button size="sm" onClick={() => setDrawerOpen(true)}>
                                Crear sesión
                            </Button>
                        }
                    />
                ) : (
                    <div className="sessions-today__grid">
                        {todaySessions.map((session) => {
                            const badgeVariant = SESSION_STATUS_VARIANT[session.status] || "neutral";
                            return (
                                <article
                                    key={`today-${session.id}`}
                                    className="sessions-today-card cursor-pointer"
                                    onClick={() => setSelectedSessionId(session.id)}
                                >
                                    <div className="sessions-today-card__time">
                                        <span>{formatTime(session.datetime)}</span>
                                        <Badge variant={badgeVariant}>{SESSION_STATUS_LABEL[session.status] || session.status}</Badge>
                                    </div>
                                    <h3 className="sessions-today-card__title">{getFullName(session)}</h3>
                                    <p className="sessions-today-card__meta">{session.professionalName || session.professional?.name || "—"}</p>
                                    <p className="sessions-today-card__submeta">{formatSessionModality(session)}</p>
                                    <div className="sessions-today-card__actions">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleLinkDirect(session);
                                            }}
                                        >
                                            {session.noteId ? getSessionNoteLabel(session, isAssistant) : 'Nota'}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleExportIcs(session.id);
                                            }}
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
                            list="sessions-patients-list"
                            assistiveText="Escribe para filtrar por paciente o selecciona una sugerencia."
                        />
                        <datalist id="sessions-patients-list">
                            {patientSearchOptions.map((option) => (
                                <option
                                    key={option.id}
                                    value={option.fullName}
                                    label={option.details || option.fullName}
                                />
                            ))}
                        </datalist>
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
                                    {STATUS_OPTIONS.map((option, index) => (
                                        <option
                                            key={option.value || `status_todos_${index}`}
                                            value={option.value}
                                        >
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
                <Table density="compact" className="table--responsive">
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
                            const patientFullName = getFullName(session);
                            const TRANSITIONS = {
                                [SESSION_STATUS.PROGRAMADA]: [SESSION_STATUS.CONFIRMADA, SESSION_STATUS.CANCELADA],
                                [SESSION_STATUS.CONFIRMADA]: [SESSION_STATUS.ATENDIDA, SESSION_STATUS.NO_PRESENTADA, SESSION_STATUS.CANCELADA],
                                [SESSION_STATUS.ATENDIDA]: [],
                                [SESSION_STATUS.NO_PRESENTADA]: [],
                                [SESSION_STATUS.CANCELADA]: [],
                            };
                            const canEdit = !isAssistant && (TRANSITIONS[session.status]?.length ?? 0) > 0;

                            return (
                                <tr
                                    key={session.id}
                                    onClick={() => setSelectedSessionId(session.id)}
                                    className="cursor-pointer"
                                >
                                    <td>
                                        <p className="sessions-table__primary">{formatDateTime(session.datetime)}</p>
                                        <p className="sessions-table__meta">{formatSessionModality(session)}</p>
                                    </td>
                                    <td>{patientFullName}</td>
                                    <td>{session.professionalName || session.professional?.name || "—"}</td>
                                    <td>
                                        <Badge variant={badgeVariant}>{SESSION_STATUS_LABEL[session.status] || session.status}</Badge>
                                    </td>

                                    <td onClick={(e) => e.stopPropagation()}>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleLinkDirect(session);
                                            }}
                                            title={session.noteId ? 'Ver nota clínica' : 'Crear/Vincular nota clínica'}
                                        >
                                            {session.noteId ? getSessionNoteLabel(session, isAssistant) : 'Nota'}
                                        </Button>
                                    </td>

                                    <td className="align-right">
                                        <div className="session-actions-cell">
                                            {canEdit && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedSessionId(session.id);
                                                    }}
                                                >
                                                    Editar
                                                </Button>
                                            )}
                                            {/* Botón ICS */}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleExportIcs(session.id);
                                                }}
                                                loading={icsLoading === session.id}
                                                title="Descargar evento (.ics)"
                                            >
                                                .ics
                                            </Button>
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
                    onStartRegistration={handleStartRegistration}
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
                    Se registró la sesión de {getFullName(pendingNoteSession)}. ¿Deseas crear la nota de evolución en este momento?
                </p>
            </Modal>

            <SessionDetailDrawer
                sessionId={selectedSessionId}
                onClose={() => setSelectedSessionId(null)}
                onUpdate={(updatedSession) => {
                    updateSessionInState(updatedSession.id, () => updatedSession);
                    updateTodaySession(updatedSession.id, () => updatedSession);
                    setSelectedSessionId(null);
                }}
                isAssistant={isAssistant}
                user={user}
            />
        </section>
    );
}
