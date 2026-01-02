import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Users, Calendar, Pill, BarChart, BarChart2, Menu, Settings } from "lucide-react";
import { ROUTES, ROLES, SESSION_STATUS_LABEL } from "../utils/constants";
import auditService from "../services/auditService";
import authService from "../services/authService";
import {
  getStats as fetchDashboardStats,
  getTodaySessions,
  getRecentNotes,
  getRecentPrescriptions,
  getIncompleteHistories,
} from "../services/dashboardService";
import DashboardStats from "../components/DashboardStats";
import Button from "../components/UI/Button";
import Modal from "../components/UI/Modal";
import DashboardQuickLinks from "../components/DashboardQuickLinks";
import DashboardHeader from "../components/DashboardHeader";
import WidgetTodaySessions from "../components/WidgetTodaySessions";
import WidgetRecentNotes from "../components/WidgetRecentNotes";
import WidgetRecentPrescriptions from "../components/WidgetRecentPrescriptions";
import WidgetIncompleteHistory from "../components/WidgetIncompleteHistory";
import NextSteps from "../components/NextSteps";

const ADMINISTRATION_ROUTE = ROUTES.administration || ROUTES.admin || null;

const DASHBOARD_ACTIONS = [
  {
    id: "patients",
    title: "Pacientes",
    description: "Consulta y crea expedientes clínicos.",
    to: ROUTES.patients,
    icon: Users,
    roles: [ROLES.ADMIN, ROLES.PROFESSIONAL, ROLES.ASSISTANT],
    ctaLabel: "Gestionar",
    assistantCtaLabel: "Ver",
  },
  {
    id: "sessions",
    title: "Sesiones",
    description: "Gestiona tu agenda terapéutica.",
    to: ROUTES.sessions,
    icon: Calendar,
    roles: [ROLES.ADMIN, ROLES.PROFESSIONAL, ROLES.ASSISTANT],
    ctaLabel: "Gestionar",
    assistantCtaLabel: "Ver",
  },
  {
    id: "reports",
    title: "Reportes",
    description: "Exporta información NOM-024.",
    to: ROUTES.reports,
    icon: BarChart,
    roles: [ROLES.ADMIN, ROLES.PROFESSIONAL],
    ctaLabel: "Generar",
  },
  {
    id: "prescriptions",
    title: "Prescripciones",
    description: "Genera y registra prescripciones controladas.",
    to: ROUTES.prescriptions,
    icon: Pill,
    roles: [ROLES.ADMIN, ROLES.PROFESSIONAL],
    ctaLabel: "Emitir",
    assistantCtaLabel: "Ver",
  },
];

if (ADMINISTRATION_ROUTE) {
  DASHBOARD_ACTIONS.push({
    id: "administration",
    title: "Administración",
    description: "Configura parámetros operativos y accesos del equipo.",
    to: ADMINISTRATION_ROUTE,
    icon: Settings,
    roles: [ROLES.ADMIN],
    ctaLabel: "Abrir",
  });
}

const STORAGE_KEY = "dashboard.quickActions";
export default function Dashboard() {
  const navigate = useNavigate();
  const {
    role: outletRole,
    toggleSidebar: toggleSidebarGlobal,
    isMobile,
  } = useOutletContext() ?? {};
  const [role, setRole] = useState(() => outletRole || authService.currentRole() || null);
  useEffect(() => {
    const resolvedRole = outletRole || authService.currentRole() || null;
    setRole(resolvedRole);
  }, [outletRole]);
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
    histories: { items: [], loading: true, error: null },
  });
  const [reloadKey, setReloadKey] = useState(0);
  const hasLoggedDashboardOpen = useRef(false);
  const dashboardLoaders = useMemo(
    () => ({
      sessions: () => getTodaySessions(),
      notes: () => getRecentNotes(),
      prescriptions: () => getRecentPrescriptions(),
      histories: () => getIncompleteHistories(),
    }),
    []
  );

  useEffect(() => {
    if (hasLoggedDashboardOpen.current) {
      return;
    }
    hasLoggedDashboardOpen.current = true;
    const resolvedRole = role || outletRole || authService.currentRole() || null;
    // Log audit asynchronously - don't block dashboard load
    auditService.logAudit("dashboard_open", { role: resolvedRole || "unknown" }, { silent: true })
      .catch(() => {
        // Silently fail - audit logging should never block dashboard
      });
  }, [role, outletRole]);

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
        auditService.logAudit("dashboard_stats_error", {
          code: lastError?.status || lastError?.code || "unknown_error",
          message: lastError?.message || "No se pudieron cargar las métricas.",
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
      histories: { ...prev.histories, loading: true, error: null },
    }));

    (async () => {
      const [sessionsResult, notesResult, prescriptionsResult, historiesResult] = await Promise.allSettled([
        dashboardLoaders.sessions(),
        dashboardLoaders.notes(),
        dashboardLoaders.prescriptions(),
        dashboardLoaders.histories(),
      ]);

      if (!active) return;

      const limitItems = (value) =>
        Array.isArray(value) ? value.slice(0, 5) : [];

      setWidgetsState({
        sessions: {
          items: sessionsResult.status === "fulfilled" ? limitItems(sessionsResult.value) : [],
          loading: false,
          error: sessionsResult.status === "rejected" ? sessionsResult.reason : null,
        },
        notes: {
          items: notesResult.status === "fulfilled" ? limitItems(notesResult.value) : [],
          loading: false,
          error: notesResult.status === "rejected" ? notesResult.reason : null,
        },
        prescriptions: {
          items:
            prescriptionsResult.status === "fulfilled" ? limitItems(prescriptionsResult.value) : [],
          loading: false,
          error:
            prescriptionsResult.status === "rejected" ? prescriptionsResult.reason : null,
        },
        histories: {
          items:
            historiesResult.status === "fulfilled" ? limitItems(historiesResult.value) : [],
          loading: false,
          error:
            historiesResult.status === "rejected" ? historiesResult.reason : null,
        },
      });
    })();

    return () => {
      active = false;
    };
  }, [dashboardLoaders, reloadKey]);

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

    const definitions = [
      {
        id: "patientsActive",
        icon: Users,
        label: "Pacientes activos",
        value: formatNumber(data.patientsActive ?? 0),
        subtext: "Seguimiento activo",
        roles: [ROLES.ADMIN, ROLES.PROFESSIONAL, ROLES.ASSISTANT],
      },
      {
        id: "sessionsToday",
        icon: Calendar,
        label: "Sesiones hoy",
        value: sessionCount,
        subtext: `${cancelledCount} canceladas`,
        roles: [ROLES.ADMIN, ROLES.PROFESSIONAL, ROLES.ASSISTANT],
      },
      {
        id: "prescriptionsActive",
        icon: Pill,
        label: "Prescripciones vigentes",
        value: formatNumber(data.prescriptionsActive ?? 0),
        subtext: lastPrescription
          ? `Última emisión ${lastPrescription}`
          : "Sin emisiones recientes",
        roles: [ROLES.ADMIN, ROLES.PROFESSIONAL],
      },
      {
        id: "reportsGenerated",
        icon: BarChart2,
        label: "Reportes generados",
        value: formatNumber(data.reportsGenerated ?? 0),
        subtext: `Avance al ${clampedProgress}%`,
        roles: [ROLES.ADMIN, ROLES.PROFESSIONAL],
      },
    ];

    return definitions
      .filter((item) => {
        if (!item.roles?.length || !role) {
          return true;
        }
        return item.roles.includes(role);
      })
      .map((item) => ({
        ...item,
        testId: `dashboard-stat-${item.id}`,
      }));
  }, [numberFormatter, role, statsState.data, timeFormatter]);

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

  const handleStatClick = useCallback((stat) => {
    if (!stat?.id) {
      return;
    }
    auditService.logAudit("dashboard_stat_click", { stat: stat.id });
  }, []);

  const handleReload = (origin = "manual", meta = {}) => {
    setReloadKey((current) => current + 1);
    auditService.logAudit("dashboard_stats_retry", {
      origin,
      reason:
        meta.reason ||
        statsState.error?.message ||
        widgetsState[origin]?.error?.message ||
        "manual_retry",
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

  const widgetRoutes = useMemo(
    () => ({
      sessions: ROUTES.sessions,
      notes: ROUTES.patients,
      prescriptions: ROUTES.prescriptions,
      histories: ROUTES.patients,
    }),
    []
  );

  const handleWidgetViewAll = (widgetKey) => {
    const destination = widgetRoutes[widgetKey];
    if (!destination) return;
    auditService.logAudit("dashboard_widget_open", { widget: widgetKey, scope: "all" });
    navigateTo(destination);
  };

  const handleWidgetCreate = (widgetKey) => {
    const destination = widgetRoutes[widgetKey];
    if (!destination) return;
    auditService.logAudit("dashboard_widget_open", { widget: widgetKey, scope: "create" });
    navigateTo(destination);
  };

  const handleWidgetRowClick = (widgetKey, item) => {
    let destination = widgetRoutes[widgetKey] || null;
    let state;

    if (widgetKey === "sessions") {
      state = item?.id ? { focusSessionId: item.id } : undefined;
    } else if (widgetKey === "notes") {
      if (item?.patientId) {
        destination = `/patients/${item.patientId}${item?.id ? `/notes/${item.id}` : "/notes"}`;
      }
    } else if (widgetKey === "prescriptions" && item?.patientId) {
      destination = `/patients/${item.patientId}`;
    } else if (widgetKey === "histories" && item?.patientId) {
      destination = `/patients/${item.patientId}/history`;
    }

    auditService.logAudit("dashboard_widget_row_click", {
      widget: widgetKey,
      id: item?.id ?? null,
      patientId: item?.patientId ?? null,
    });

    navigateTo(destination, state);
  };

  const actions = useMemo(() => {
    return DASHBOARD_ACTIONS.filter((action) => {
      const allowedRoles = Array.isArray(action.roles) ? action.roles : null;
      if (!allowedRoles || !allowedRoles.length) {
        return true;
      }
      if (!role) {
        return true;
      }
      return allowedRoles.includes(role);
    });
  }, [role]);
  const defaultSelection = useMemo(() => actions.map((action) => action.to), [actions]);
  const [activeModules, setActiveModules] = useState(null);
  const [isEditingShortcuts, setIsEditingShortcuts] = useState(false);
  const [pendingSelection, setPendingSelection] = useState([]);
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

  const visibleActions =
    activeModules === null
      ? actions
      : actions.filter((action) => activeModules.includes(action.to));

  const isAssistant = role === ROLES.ASSISTANT;

  const quickLinkItems = useMemo(
    () =>
      visibleActions.map((action) => {
        const label = isAssistant
          ? action.assistantCtaLabel || "Ver"
          : action.ctaLabel || "Ir ahora";
        const ariaVerb = isAssistant ? "Ver" : label;
        return {
          ...action,
          ctaLabel: label,
          ariaLabel: `${ariaVerb} ${action.title}`,
        };
      }),
    [isAssistant, visibleActions]
  );

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

  const handleNavigate = (route, action) => {
    if (!route) return;
    if (action?.id) {
      auditService.logAudit("dashboard_quicklink_click", {
        to: action.id,
        route,
      });
    }
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditingShortcuts(true)}
            data-testid="dashboard-edit-shortcuts"
          >
            Editar accesos rápidos
          </Button>
        </>
      </DashboardHeader>

      <DashboardStats
        stats={stats}
        loading={statsState.loading}
        emptyMessage={statsState.error ? "" : "No hay métricas disponibles."}
        onStatClick={handleStatClick}
      />

      {statsState.error ? (
        <div className="alert alert--error" role="alert" data-testid="dashboard-stats-error">
          <div className="alert__content">
            <h3 className="alert__title">No se pudieron cargar las métricas</h3>
            <p className="alert__message">
              {statsState.error?.message || "Intenta nuevamente en unos momentos."}
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              handleReload("stats", {
                reason: statsState.error?.message || "manual_retry",
              })
            }
            disabled={statsState.loading}
            data-testid="dashboard-stats-retry"
          >
            Reintentar
          </Button>
        </div>
      ) : null}

      <div className="dashboard-widgets">
        <WidgetTodaySessions
          loading={widgetsState.sessions.loading}
          error={widgetsState.sessions.error}
          items={widgetsState.sessions.items}
          onRetry={() =>
            handleReload("sessions", {
              reason: widgetsState.sessions.error?.message || "manual_retry",
            })
          }
          onViewAll={() => handleWidgetViewAll("sessions")}
          onCreate={() => handleWidgetCreate("sessions")}
          onItemClick={(item) => handleWidgetRowClick("sessions", item)}
          formatTime={formatTimeValue}
          getStatusLabel={(status) => SESSION_STATUS_LABEL[status] || status || "Sin estado"}
          canCreate={!isAssistant}
        />

        <WidgetRecentNotes
          loading={widgetsState.notes.loading}
          error={widgetsState.notes.error}
          items={widgetsState.notes.items}
          onRetry={() =>
            handleReload("notes", {
              reason: widgetsState.notes.error?.message || "manual_retry",
            })
          }
          onViewAll={() => handleWidgetViewAll("notes")}
          onCreate={() => handleWidgetCreate("notes")}
          onItemClick={(item) => handleWidgetRowClick("notes", item)}
          formatDateTime={formatDateTimeValue}
          canCreate={!isAssistant}
        />

        <WidgetRecentPrescriptions
          loading={widgetsState.prescriptions.loading}
          error={widgetsState.prescriptions.error}
          items={widgetsState.prescriptions.items}
          onRetry={() =>
            handleReload("prescriptions", {
              reason: widgetsState.prescriptions.error?.message || "manual_retry",
            })
          }
          onViewAll={() => handleWidgetViewAll("prescriptions")}
          onCreate={() => handleWidgetCreate("prescriptions")}
          onItemClick={(item) => handleWidgetRowClick("prescriptions", item)}
          formatDateTime={formatDateTimeValue}
          canCreate={!isAssistant}
        />

        {!isAssistant && (
          <WidgetIncompleteHistory
            loading={widgetsState.histories.loading}
            error={widgetsState.histories.error}
            items={widgetsState.histories.items}
            onRetry={() =>
              handleReload("histories", {
                reason: widgetsState.histories.error?.message || "manual_retry",
              })
            }
            onViewAll={() => handleWidgetViewAll("histories")}
            onItemClick={(item) => handleWidgetRowClick("histories", item)}
            formatDateTime={formatDateTimeValue}
            canCreate={!isAssistant}
          />
        )}
      </div>

      <DashboardQuickLinks
        actions={quickLinkItems}
        onNavigate={handleNavigate}
        loadingAction={loadingAction}
        onEditShortcuts={() => setIsEditingShortcuts(true)}
      />
      <NextSteps />
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
