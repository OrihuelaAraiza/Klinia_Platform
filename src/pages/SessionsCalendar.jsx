import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom"; 
// 🚨 Importar componentes necesarios
import SessionDetailDrawer from "../components/SessionDetailDrawer"; // 🚨 IMPORTADO
import SessionMiniCalendar from "../components/SessionMiniCalendar";
import Table, { TableEmpty } from "../components/UI/Table";
import Badge from "../components/UI/Badge";
import Button from "../components/UI/Button";
import { useToast } from "../components/UI/Toast";
import auditService from "../services/auditService";
import { listSessions } from "../services/sessionsService";
import { ROUTES, SESSION_STATUS_LABEL, SESSION_STATUS_VARIANT } from "../utils/constants";
import {
    formatSessionModality,
    getSessionPatientName,
} from "../utils/sessionHelpers";

const VIEW_OPTIONS = [
    { value: "month", label: "Mes" },
    { value: "week", label: "Semana" },
];

function formatDateTime(value) {
    if (!value) return "—";
    return new Date(value).toLocaleString("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

function toDateKey(date) {
    return date.toISOString().slice(0, 10);
}

function toLocalDateKey(isoString) {
    if (!isoString) return null;
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}


function getMonthRange(date) {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    start.setDate(start.getDate() - 7);
    end.setDate(end.getDate() + 7);
    return {
        from: toDateKey(start),
        to: toDateKey(end),
    };
}

function getWeekStart(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    let day = d.getDay();
    if (day === 0) day = 7; 
    d.setDate(d.getDate() - (day - 1));
    return d;
}


export default function SessionsCalendar() {
    const navigate = useNavigate();
    const toast = useToast();
    
    const { user } = useOutletContext() ?? {};
    const professionalId = user?.id || "";

    const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
    const [visibleMonth, setVisibleMonth] = useState(new Date());
    const [viewMode, setViewMode] = useState("month");
    const [monthSessions, setMonthSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    
    // 🚨 ESTADO PARA ABRIR EL DRAWER DE DETALLE
    const [selectedSessionId, setSelectedSessionId] = useState(null); 


    useEffect(() => {
        let active = true; 

        async function loadSessions() {
            if (!professionalId) { 
                 setLoading(false);
                 setError("No se puede cargar el calendario sin ID de profesional.");
                 return;
            }

            setLoading(true);
            setError("");
            const { from, to } = getMonthRange(visibleMonth);

            try {
                const response = await listSessions({ from, to, size: 100, professionalId }); 

                if (!active) return; 

                const items = Array.isArray(response.items) ? response.items : response;
                setMonthSessions(items || []);
                auditService.logAudit("sessions_list", { scope: "calendar", from, to });
            } catch (err) {
                if (!active) return;
                const message = err?.message || "No pudimos cargar tu calendario.";
                setError(message);
                toast.error(message);
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }
        
        if (professionalId) {
            loadSessions();
        }

        return () => {
            active = false; 
        };
    }, [visibleMonth, toast, professionalId]); 


    const periodSessions = useMemo(() => {
        if (!monthSessions.length) {
            return [];
        }

        if (viewMode === "week") {
            const referenceDate = new Date(selectedDate);
            if (Number.isNaN(referenceDate.getTime())) {
                return [];
            }
            
            const weekStart = getWeekStart(referenceDate);
            
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999); 

            
            return monthSessions.filter((session) => {
                const dt = session.datetime ? new Date(session.datetime) : null;
                if (!dt || Number.isNaN(dt.getTime())) {
                    return false;
                }
                
                return dt >= weekStart && dt <= weekEnd;
            }).sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()); 
        }

        return monthSessions.filter(
            (session) => toLocalDateKey(session.datetime) === selectedDate
        ).sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()); 
    }, [monthSessions, viewMode, selectedDate]);


    const handleMonthChange = (date) => {
        setVisibleMonth(date);
        setSelectedDate(toDateKey(date));
    };
    
    const handleSessionUpdate = (updatedSession) => {
        setMonthSessions(prev => 
            prev.map(s => (s.id === updatedSession.id ? updatedSession : s))
        );
    };

    return (
        <>
            <section className="page stack-5">
                <div className="page-header sessions-header">
                    <div className="sessions-header__intro">
                        <h1>Calendario de sesiones</h1>
                        <p className="sessions-header__subtitle">
                            Visualiza tu agenda mensual o semanal y navega rápidamente entre días.
                        </p>
                    </div>
                    <div className="sessions-header__actions">
                        <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.sessions)}>
                            Volver a la lista
                        </Button>
                    </div>
                </div>

                <div className="sessions-calendar__layout">
                    <SessionMiniCalendar
                        sessions={monthSessions}
                        selectedDate={selectedDate}
                        onSelectDate={setSelectedDate}
                        onMonthChange={handleMonthChange}
                    />
                    <div className="sessions-calendar__panel">
                        <div className="sessions-calendar__panel-header">
                            <h2>{viewMode === "week" ? "Semana seleccionada" : "Sesiones del día"}</h2>
                            <div className="sessions-calendar__toggle">
                                {VIEW_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        className={viewMode === option.value ? "is-active" : ""}
                                        onClick={() => setViewMode(option.value)}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="sessions-calendar__summary">
                            {viewMode === "week" ? (
                                <p>
                                    Mostrando sesiones de la semana del{" "}
                                    {new Date(selectedDate).toLocaleDateString("es-MX", { dateStyle: "medium" })}
                                </p>
                            ) : (
                                <p>
                                    {new Date(selectedDate).toLocaleDateString("es-MX", {
                                        weekday: "long",
                                        day: "numeric",
                                        month: "long",
                                    })}
                                </p>
                            )}
                        </div>
                        <Table density="comfortable">
                            <thead>
                                <tr>
                                    <th>Fecha y hora</th>
                                    <th>Paciente</th>
                                    <th>Profesional</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                       <td colSpan={4}>Cargando tus sesiones...</td>
                                    </tr>
                                ) : null}
                                {!loading && periodSessions.length === 0 ? (
                                    <tr>
                                        <td colSpan={4}>
                                            <TableEmpty
                                                title="Sin sesiones registradas"
                                                description={error || "No hay sesiones para el periodo seleccionado."}
                                            />
                                        </td>
                                    </tr>
                                ) : null}
                                {periodSessions.map((session) => {
                                    const variant = SESSION_STATUS_VARIANT[session.status] || "neutral";
                                    return (
                                        <tr 
                                            key={session.id} 
                                            className="cursor-pointer" 
                                            onClick={() => setSelectedSessionId(session.id)}
                                        >
                                            <td>
                                                <p className="sessions-table__primary">{formatDateTime(session.datetime)}</p>
                                                <p className="sessions-table__meta">{formatSessionModality(session)}</p>
                                            </td>
                                            <td>{getSessionPatientName(session)}</td>
                                            <td>{session.professional?.name || session.professionalName || "—"}</td>
                                            <td>
                                                <Badge variant={variant}>{SESSION_STATUS_LABEL[session.status] || session.status}</Badge>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    </div>
                </div>
            </section>
            
            <SessionDetailDrawer
                sessionId={selectedSessionId}
                onClose={() => setSelectedSessionId(null)}
                onUpdate={handleSessionUpdate} 
                user={user}
                isAssistant={false} 
            />
        </>
    );
}