import { useNavigate, useOutletContext } from "react-router-dom";
import { Users, Calendar, Pill, BarChart } from "lucide-react";
import { ROUTES, ROLES } from "../utils/constants";

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

export default function Dashboard() {
  const navigate = useNavigate();
  const { role } = useOutletContext() ?? {};

  const actions = DASHBOARD_ACTIONS.filter(({ hiddenFor = [] }) =>
    role ? !hiddenFor.includes(role) : true
  );

  return (
    <section className="page stack-5 dashboard-page">
      <div className="page-header">
        <div className="stack-1">
          <h1 className="dashboard-page__title">Panel general</h1>
          <p className="dashboard-page__subtitle">
            Accesos rápidos a los módulos clínicos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.title}
              type="button"
              onClick={() => navigate(action.to)}
              className="dashboard-module"
            >
              <div className="dashboard-module__header">
                <div className="dashboard-module__icon">
                  <Icon aria-hidden="true" />
                </div>
                <h2 className="dashboard-page__section-title">{action.title}</h2>
              </div>
              <p className="dashboard-page__body-text">{action.description}</p>
              <span className="dashboard-module__cta">Ir ahora</span>
            </button>
          );
        })}
      </div>
      <div className="dashboard-module dashboard-module--static">
        <h2 className="dashboard-page__section-title">Próximos pasos sugeridos</h2>
        <p className="dashboard-page__subtitle">
          Optimiza tu flujo clínico con estas recomendaciones:
        </p>
        <ul className="list dashboard-page__list">
          <li>Configura consentimientos digitales personalizados para tu equipo.</li>
          <li>Conecta recordatorios SMS/Email para tus sesiones.</li>
          <li>Centraliza adjuntos y notas heredadas en el expediente digital.</li>
        </ul>
      </div>
    </section>
  );
}
