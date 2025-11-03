import { useNavigate, useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Calendar, Pill, BarChart } from "lucide-react";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Button from "../components/UI/Button";
import { ROUTES, ROLES } from "../utils/constants";

const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

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

      <div className="dashboard-grid">
        {actions.map((action, index) => {
          const Icon = action.icon;

          return (
            <motion.div
              key={action.title}
              variants={CARD_VARIANTS}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.25, delay: index * 0.05, ease: "easeOut" }}
            >
              <Card hoverable onClick={() => navigate(action.to)} style={{ cursor: "pointer" }}>
                <CardHeader>
                  <div className="dashboard-page__card-title">
                    <Icon className="dashboard-page__icon" aria-hidden="true" />
                    <h2 className="dashboard-page__section-title">{action.title}</h2>
                  </div>
                </CardHeader>
                <CardBody className="stack-2">
                  <p className="dashboard-page__body-text">{action.description}</p>
                  <Button variant="accent" size="sm" onClick={() => navigate(action.to)}>
                    Ir ahora
                  </Button>
                </CardBody>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card hoverable={false}>
        <CardHeader>
          <h2 className="dashboard-page__section-title">Próximos pasos sugeridos</h2>
        </CardHeader>
        <CardBody className="stack-2">
          <p className="dashboard-page__subtitle">
            Optimiza tu flujo clínico con estas recomendaciones:
          </p>
          <ul className="list dashboard-page__list">
            <li>Configura consentimientos digitales personalizados para tu equipo.</li>
            <li>Conecta recordatorios SMS/Email para tus sesiones.</li>
            <li>Centraliza adjuntos y notas heredadas en el expediente digital.</li>
          </ul>
        </CardBody>
      </Card>
    </section>
  );
}
