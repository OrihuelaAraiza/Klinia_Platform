import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { Users, Calendar, Pill, BarChart, BarChart2, CheckCircle2, Menu } from "lucide-react";
import { ROUTES, ROLES } from "../utils/constants";
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
  const stats = useMemo(() => {
    const seed = new Date().getDate();
    const formatter = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
    const base = [
      {
        icon: Users,
        label: "Pacientes activos",
        computeValue: () => 240 + ((seed * 3) % 18),
        subtext: "+5% esta semana",
      },
      {
        icon: Calendar,
        label: "Sesiones programadas hoy",
        computeValue: () => 14 + (seed % 6),
        subtext: "3 canceladas",
      },
      {
        icon: Pill,
        label: "Prescripciones vigentes",
        computeValue: () => 32 + (seed % 9),
        subtext: "Última emisión hoy 08:00",
      },
      {
        icon: BarChart2,
        label: "Reportes generados",
        computeValue: () => 8 + (seed % 5),
        subtext: "Mensualidad al 78%",
      },
    ];

    return base.map((stat) => ({
      icon: stat.icon,
      label: stat.label,
      value: formatter.format(stat.computeValue()),
      subtext: stat.subtext,
    }));
  }, []);

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

      <DashboardStats stats={stats} />

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
