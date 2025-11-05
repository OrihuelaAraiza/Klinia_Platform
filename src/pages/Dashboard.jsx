import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { Users, Calendar, Pill, BarChart, BarChart2, CheckCircle2, Menu } from "lucide-react";
import { ROUTES, ROLES, SESSION_STATUS_LABEL } from "../utils/constants";
import auditService from "../services/auditService";
import {
  getStats as fetchDashboardStats,
  getTodaySessions,
  getRecentNotes,
  getRecentPrescriptions,
} from "../services/dashboardService";
import DashboardStats from "../components/DashboardStats";
import Button from "../components/UI/Button";
import Modal from "../components/UI/Modal";
import DashboardCard from "../components/DashboardCard";
import DashboardHeader from "../components/DashboardHeader";

const DASHBOARD_ACTIONS = [
  {
    title: "Pacientes",
    description: "Consulta y crea expedientes clínicos.",
    to: ROUTES.patients,
    icon: Users,
  },
  {
    title: "Sesiones",
    description: "Gestiona tu agenda terapéutica.",
    to: ROUTES.sessions,
    icon: Calendar,
  },
  {
    title: "Reportes",
    description: "Exporta información NOM-024.",
    to: ROUTES.reports,
    icon: BarChart,
  },
  {
    title: "Prescripciones",
    description: "Genera y registra prescripciones controladas.",
    to: ROUTES.prescriptions,
    icon: Pill,
    hiddenFor: [ROLES.ASSISTANT],
  },
];

const STORAGE_KEY = "dashboard.quickActions";
const SUGGESTIONS_KEY = "dashboard.suggestions";
const SUGGESTIONS = [
  {
    id: "consents",
    title: "Configura consentimientos digitales personalizados para tu equipo.",
  },
  {
    id: "reminders",
    title: "Conecta recordatorios SMS/Email para tus sesiones.",
  },
  {
    id: "attachments",
    title: "Centraliza adjuntos y notas heredadas en el expediente digital.",
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { role, toggleSidebar: toggleSidebarGlobal, isMobile } = useOutletContext() ?? {};
  const storageKey = useMemo(() => `${STORAGE_KEY}:${role || "default"}`, [role]);
  const [statsState, setStatsState] = useState({
    data: null,
    loading: true,
    error: null,
  });
  const [widgetsState, setWidgetsState] = useState({
    sessions: { items: [], loading: true, error: null },
    notes: { items: [], loading: true, error: null },
    prescriptions: { items: [], loading: true, error: null },
  });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const timeouts = new Set();

    const schedule = (fn, delay) => {
      const id = setTimeout(() => {
        timeouts.delete(id);
        fn();
      }, delay);
      timeouts.add(id);
      return id;
    };

    const clearAll = () => {
      timeouts.forEach((id) => clearTimeout(id));
      timeouts.clear();
    };

    setStatsState((prev) => ({ ...prev, loading: true, error: null }));

    const skeletonDelay = 300 + Math.random() * 300;
    const runStartedAt = performance.now();

    const finalize = (apply) => {
      const elapsed = performance.now() - runStartedAt;
      const wait = Math.max(0, skeletonDelay - elapsed);
      const runner = () => {
        if (!active) {
          return;
        }
        apply();
      };
      if (wait > 0) {
        schedule(runner, wait);
      } else {
        runner();
      }
    };

    const waitFor = (ms) =>
      new Promise((resolve) => {
        schedule(resolve, ms);
      });

    (async () => {
      const startedAt = performance.now();
      let attempt = 0;
      let lastError;

      while (attempt < 3 && active) {
        try {
          const data = await fetchDashboardStats();
          finalize(() => {
            setStatsState({ data, loading: false, error: null });
            auditService.logAudit("dashboard_stats_load", {
              ok: true,
              durationMs: Math.round(performance.now() - startedAt),
            });
          });
          return;
        } catch (error) {
          lastError = error;
          attempt += 1;
          if (attempt < 3) {
            const delay = 300 * 2 ** (attempt - 1);
            await waitFor(delay);
          }
        }
      }

      finalize(() => {
        setStatsState({
          data: null,
          loading: false,
          error: lastError || new Error("No se pudieron cargar las métricas."),
        });
        auditService.logAudit("dashboard_stats_load", {
          ok: false,
          durationMs: Math.round(performance.now() - startedAt),
          error: lastError?.message || "unknown_error",
        });
      });
    })();

    return () => {
      active = false;
      clearAll();
    };
  }, [reloadKey]);

  useEffect(() => {
    let active = true;

    setWidgetsState((prev) => ({
      sessions: { ...prev.sessions, loading: true, error: null },
      notes: { ...prev.notes, loading: true, error: null },
      prescriptions: { ...prev.prescriptions, loading: true, error: null },
    }));

    (async () => {
      const [sessionsResult, notesResult, prescriptionsResult] = await Promise.allSettled([
        getTodaySessions(),
        getRecentNotes(),
        getRecentPrescriptions(),
      ]);

      if (!active) return;

      setWidgetsState({
        sessions: {
          items: sessionsResult.status === "fulfilled" ? sessionsResult.value : [],
          loading: false,
          error: sessionsResult.status === "rejected" ? sessionsResult.reason : null,
        },
        notes: {
          items: notesResult.status === "fulfilled" ? notesResult.value : [],
          loading: false,
          error: notesResult.status === "rejected" ? notesResult.reason : null,
        },
        prescriptions: {
          items:
            prescriptionsResult.status === "fulfilled" ? prescriptionsResult.value : [],
          loading: false,
          error:
            prescriptionsResult.status === "rejected" ? prescriptionsResult.reason : null,
        },
      });
    })();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 }),
    []
  );
  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    []
  );
  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-MX", {
        dateStyle: "short",
        timeStyle: "short",
      }),
    []
  );

  const stats = useMemo(() => {
    const data = statsState.data;
    if (!data) return [];

    const toNumeric = (value) => {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : 0;
    };
    const formatNumber = (value) => numberFormatter.format(toNumeric(value));
    const sessionCount = formatNumber(data.sessionsToday ?? 0);
    const cancelledCount = formatNumber(data.sessionsCancelledToday ?? 0);

    const lastPrescription = (() => {
      if (!data.lastPrescriptionTime) return null;
      const parsed = new Date(data.lastPrescriptionTime);
      if (Number.isNaN(parsed.getTime())) {
        return data.lastPrescriptionTime;
      }
      return timeFormatter.format(parsed);
    })();

    const rawProgress = toNumeric(data.reportsProgress ?? 0);
    const normalizedProgress =
      Number.isFinite(rawProgress) && rawProgress <= 1
        ? Math.round(rawProgress * 100)
        : Math.round(rawProgress);
    const clampedProgress = Math.min(100, Math.max(0, normalizedProgress));

    return [
      {
        icon: Users,
        label: "Pacientes activos",
        value: formatNumber(data.patientsActive ?? 0),
        subtext: "Seguimiento activo",
      },
      {
        icon: Calendar,
        label: "Sesiones hoy",
        value: sessionCount,
        subtext: `${cancelledCount} canceladas`,
      },
      {
        icon: Pill,
        label: "Prescripciones vigentes",
        value: formatNumber(data.prescriptionsActive ?? 0),
        subtext: lastPrescription
          ? `Última emisión ${lastPrescription}`
          : "Sin emisiones recientes",
      },
      {
        icon: BarChart2,
        label: "Reportes generados",
        value: formatNumber(data.reportsGenerated ?? 0),
        subtext: `Avance al ${clampedProgress}%`,
      },
    ];
  }, [numberFormatter, statsState.data, timeFormatter]);

  const formatTimeValue = (value) => {
    if (!value) return "Horario no registrado";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return timeFormatter.format(parsed);
  };

  const formatDateTimeValue = (value) => {
    if (!value) return "Sin registro";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return dateTimeFormatter.format(parsed);
  };

  const handleRetry = () => {
    setReloadKey((current) => current + 1);
    auditService.logAudit("dashboard_stats_retry", {
      reason: statsState.error?.message || "manual_retry",
    });
  };

  const navigateTo = (path, state) => {
    if (!path) return;
    if (state) {
      navigate(path, { state });
      return;
    }
    navigate(path);
  };

  const handleWidgetNavigate = (widgetKey) => {
    let destination = null;
    switch (widgetKey) {
      case "sessions":
        destination = ROUTES.sessions;
        break;
      case "notes":
        destination = ROUTES.patients;
        break;
      case "prescriptions":
        destination = ROUTES.prescriptions;
        break;
      default:
        break;
    }
    auditService.logAudit("dashboard_widget_open", { widget: widgetKey });
    navigateTo(destination);
  };

  const handleWidgetItemClick = (widgetKey, item) => {
    let destination = null;
    let state;

    if (widgetKey === "sessions") {
      destination = ROUTES.sessions;
      state = item?.id ? { focusSessionId: item.id } : undefined;
    } else if (widgetKey === "notes") {
      if (item?.patientId) {
        destination = `/patients/${item.patientId}${item?.id ? `/notes/${item.id}` : "/notes"}`;
      } else {
        destination = ROUTES.patients;
      }
    } else if (widgetKey === "prescriptions") {
      if (item?.patientId) {
        destination = `/patients/${item.patientId}`;
      } else {
        destination = ROUTES.prescriptions;
      }
    }

    auditService.logAudit("dashboard_widget_item", {
      widget: widgetKey,
      id: item?.id ?? null,
    });

    navigateTo(destination, state);
  };

  const renderLoadingRows = (rows = 3) => (
    <div className="dashboard-widget__skeleton" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={`widget-skeleton-${index}`} className="dashboard-widget__skeleton-row shimmer">
          <span className="skeleton skeleton--line" />
          <span className="skeleton skeleton--line short" />
        </div>
      ))}
    </div>
  );

  const renderWidgetError = (message) => (
    <div className="dashboard-widget__empty">
      <p>{message}</p>
      <Button variant="ghost" size="sm" onClick={handleRetry} disabled={statsState.loading}>
        Reintentar
      </Button>
    </div>
  );

  const renderSessionsContent = () => {
    const state = widgetsState.sessions;
    if (state.loading) {
      return renderLoadingRows();
    }
    if (state.error) {
      return renderWidgetError("No se pudieron cargar las sesiones de hoy.");
    }
    if (!state.items.length) {
      return <p className="dashboard-widget__empty">No hay sesiones registradas para hoy.</p>;
    }
    return (
      <ul className="dashboard-widget__list" role="list">
        {state.items.map((session, index) => {
          const key = session.id ?? `session-${index}`;
          const statusLabel = session.status
            ? SESSION_STATUS_LABEL[session.status] || session.status
            : "Sin estado";
          return (
            <li key={key}>
              <button
                type="button"
                className="dashboard-widget__item"
                onClick={() => handleWidgetItemClick("sessions", session)}
              >
                <span className="dashboard-widget__item-main">
                  <span className="dashboard-widget__item-title">{session.patientName}</span>
                  <span className="dashboard-widget__item-meta">
                    {formatTimeValue(session.time)} · {statusLabel}
                  </span>
                </span>
                <span className="dashboard-widget__item-icon" aria-hidden="true">
                  →
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  };

  const renderNotesContent = () => {
    const state = widgetsState.notes;
    if (state.loading) {
      return renderLoadingRows();
    }
    if (state.error) {
      return renderWidgetError("No se pudieron cargar las notas recientes.");
    }
    if (!state.items.length) {
      return <p className="dashboard-widget__empty">No hay notas cerradas recientemente.</p>;
    }
    return (
      <ul className="dashboard-widget__list" role="list">
        {state.items.map((note, index) => {
          const key = note.id ?? `note-${index}`;
          return (
            <li key={key}>
              <button
                type="button"
                className="dashboard-widget__item"
                onClick={() => handleWidgetItemClick("notes", note)}
              >
                <span className="dashboard-widget__item-main">
                  <span className="dashboard-widget__item-title">{note.patientName}</span>
                  <span className="dashboard-widget__item-meta">
                    Cerrada {formatDateTimeValue(note.closedAt)}
                  </span>
                </span>
                <span className="dashboard-widget__item-icon" aria-hidden="true">
                  →
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  };

  const renderPrescriptionsContent = () => {
    const state = widgetsState.prescriptions;
    if (state.loading) {
      return renderLoadingRows();
    }
    if (state.error) {
      return renderWidgetError("No se pudieron cargar las prescripciones recientes.");
    }
    if (!state.items.length) {
      return (
        <p className="dashboard-widget__empty">No hay prescripciones registradas recientemente.</p>
      );
    }
    return (
      <ul className="dashboard-widget__list" role="list">
        {state.items.map((prescription, index) => {
          const key = prescription.id ?? `prescription-${index}`;
          const folioLabel = prescription.folio ? `Folio ${prescription.folio}` : "Sin folio";
          return (
            <li key={key}>
              <button
                type="button"
                className="dashboard-widget__item"
                onClick={() => handleWidgetItemClick("prescriptions", prescription)}
              >
                <span className="dashboard-widget__item-main">
                  <span className="dashboard-widget__item-title">{prescription.patientName}</span>
                  <span className="dashboard-widget__item-meta">
                    {folioLabel} · {formatDateTimeValue(prescription.signedAt)}
                  </span>
                </span>
                <span className="dashboard-widget__item-icon" aria-hidden="true">
                  →
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  };

  const actions = useMemo(
    () =>
      DASHBOARD_ACTIONS.filter(({ hiddenFor = [] }) =>
        role ? !hiddenFor.includes(role) : true
      ),
    [role]
  );
  const defaultSelection = useMemo(() => actions.map((action) => action.to), [actions]);
  const [activeModules, setActiveModules] = useState(null);
  const [isEditingShortcuts, setIsEditingShortcuts] = useState(false);
  const [pendingSelection, setPendingSelection] = useState([]);
  const [suggestionStates, setSuggestionStates] = useState({});
  const [loadingAction, setLoadingAction] = useState(null);
  const loadingTimer = useRef();

  useEffect(() => {
    if (!actions.length) {
      setActiveModules([]);
      return;
    }

    if (typeof window === "undefined") {
      setActiveModules(defaultSelection);
      return;
    }

    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const filtered = parsed.filter((route) => defaultSelection.includes(route));
        setActiveModules(filtered.length ? filtered : defaultSelection);
        return;
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn("[Dashboard] Error leyendo accesos rápidos:", error);
      }
    }

    setActiveModules(defaultSelection);
  }, [actions, defaultSelection, storageKey]);

  useEffect(() => {
    if (!activeModules || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(activeModules));
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn("[Dashboard] Error guardando accesos rápidos:", error);
      }
    }
  }, [activeModules, storageKey]);

  useEffect(() => {
    if (!isEditingShortcuts) {
      setPendingSelection(activeModules ?? []);
    }
  }, [activeModules, isEditingShortcuts]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(SUGGESTIONS_KEY);
      if (stored) {
        setSuggestionStates(JSON.parse(stored));
        return;
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn("[Dashboard] No se pudieron leer sugerencias:", error);
      }
    }
    setSuggestionStates({});
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(suggestionStates));
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn("[Dashboard] No se pudieron guardar sugerencias:", error);
      }
    }
  }, [suggestionStates]);

  const visibleActions =
    activeModules === null
      ? actions
      : actions.filter((action) => activeModules.includes(action.to));

  const togglePendingRoute = (route) => {
    setPendingSelection((current) =>
      current.includes(route) ? current.filter((value) => value !== route) : [...current, route]
    );
  };

  const closeShortcutsModal = () => setIsEditingShortcuts(false);

  const saveShortcuts = () => {
    if (!pendingSelection.length) return;
    setActiveModules(pendingSelection);
    setIsEditingShortcuts(false);
  };

  const toggleSuggestion = (id) => {
    setSuggestionStates((current) => {
      const next = { ...current, [id]: !current[id] };
      return next;
    });
  };

  const handleNavigate = (route) => {
    setLoadingAction(route);
    if (loadingTimer.current) clearTimeout(loadingTimer.current);
    loadingTimer.current = window.setTimeout(() => {
      navigate(route);
      setLoadingAction(null);
    }, 260);
  };

  useEffect(
    () => () => {
      if (loadingTimer.current) clearTimeout(loadingTimer.current);
    },
    []
  );

  return (
    <section className="page stack-5 dashboard-page">
      <DashboardHeader title="Panel general" subtitle="Accesos rápidos a los módulos clínicos.">
        <>
          {isMobile ? (
            <Button
              variant="ghost"
              size="sm"
              className="dashboard-header__hamburger"
              onClick={() => toggleSidebarGlobal?.()}
            >
              <Menu aria-hidden="true" />
              <span>Menú</span>
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={() => setIsEditingShortcuts(true)}>
            Editar accesos rápidos
          </Button>
        </>
      </DashboardHeader>

      <DashboardStats
        stats={stats}
        loading={statsState.loading}
        emptyMessage={statsState.error ? "" : "No hay métricas disponibles."}
      />

      {statsState.error ? (
        <div className="alert alert--error" role="alert">
          <div className="alert__content">
            <h3 className="alert__title">No se pudieron cargar las métricas</h3>
            <p className="alert__message">
              {statsState.error?.message || "Intenta nuevamente en unos momentos."}
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleRetry}
            disabled={statsState.loading}
          >
            Reintentar
          </Button>
        </div>
      ) : null}

      <div className="dashboard-widgets">
        <section className="dashboard-widget" aria-labelledby="dashboard-widget-sessions">
          <div className="dashboard-widget__header">
            <h2 id="dashboard-widget-sessions" className="dashboard-widget__title">
              Sesiones de hoy
            </h2>
            <Button variant="ghost" size="sm" onClick={() => handleWidgetNavigate("sessions")}>
              Ver agenda
            </Button>
          </div>
          {renderSessionsContent()}
        </section>

        <section className="dashboard-widget" aria-labelledby="dashboard-widget-notes">
          <div className="dashboard-widget__header">
            <h2 id="dashboard-widget-notes" className="dashboard-widget__title">
              Notas recientes
            </h2>
            <Button variant="ghost" size="sm" onClick={() => handleWidgetNavigate("notes")}>
              Ver pacientes
            </Button>
          </div>
          {renderNotesContent()}
        </section>

        <section
          className="dashboard-widget"
          aria-labelledby="dashboard-widget-prescriptions"
        >
          <div className="dashboard-widget__header">
            <h2 id="dashboard-widget-prescriptions" className="dashboard-widget__title">
              Prescripciones recientes
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleWidgetNavigate("prescriptions")}
            >
              Ver historial
            </Button>
          </div>
          {renderPrescriptionsContent()}
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {visibleActions.length === 0 ? (
          <div className="dashboard-module dashboard-module--static">
            <h2 className="dashboard-page__section-title">Sin accesos visibles</h2>
            <p className="dashboard-page__body-text">
              Selecciona los módulos que deseas mostrar usando “Editar accesos rápidos”.
            </p>
            <Button variant="accent" size="sm" onClick={() => setIsEditingShortcuts(true)}>
              Configurar accesos
            </Button>
          </div>
        ) : (
          visibleActions.map((action, index) => (
            <DashboardCard
              key={action.title}
              variant="shortcut"
              icon={action.icon}
              title={action.title}
              description={action.description}
              onClick={() => handleNavigate(action.to)}
              loading={loadingAction === action.to}
              delay={index * 0.05}
              ariaLabel={`Ir al módulo ${action.title}`}
            />
          ))
        )}
      </div>
      <div className="dashboard-module dashboard-module--static">
        <h2 className="dashboard-page__section-title">Próximos pasos sugeridos</h2>
        <p className="dashboard-page__subtitle">
          Optimiza tu flujo clínico con estas recomendaciones:
        </p>
        <ul className="dashboard-suggestions" role="list">
          <AnimatePresence>
            {SUGGESTIONS.map((item) => {
              const completed = Boolean(suggestionStates[item.id]);
              return (
                <Motion.li
                  key={item.id}
                  role="listitem"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="dashboard-suggestion">
                    <input
                      type="checkbox"
                      checked={completed}
                      onChange={() => toggleSuggestion(item.id)}
                    />
                    <span className="dashboard-suggestion__status" data-completed={completed}>
                      {completed ? <CheckCircle2 aria-hidden="true" /> : null}
                    </span>
                    <span className="dashboard-suggestion__text">{item.title}</span>
                  </label>
                </Motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </div>
      <Modal
        open={isEditingShortcuts}
        onClose={closeShortcutsModal}
        title="Editar accesos rápidos"
        footer={
          <div className="cluster">
            <Button variant="ghost" onClick={closeShortcutsModal}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={saveShortcuts}
              disabled={!pendingSelection.length}
            >
              Guardar cambios
            </Button>
          </div>
        }
      >
        <div className="dashboard-quick-edit">
          {actions.map((action) => (
            <label key={action.to} className="dashboard-quick-edit__option">
              <input
                type="checkbox"
                checked={pendingSelection.includes(action.to)}
                onChange={() => togglePendingRoute(action.to)}
              />
              <div>
                <span className="dashboard-quick-edit__label">{action.title}</span>
                <p className="dashboard-quick-edit__description">{action.description}</p>
              </div>
            </label>
          ))}
        </div>
      </Modal>
    </section>
  );
}
