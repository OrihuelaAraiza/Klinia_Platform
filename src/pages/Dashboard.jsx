import { useNavigate, useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import Card, { CardBody, CardHeader } from "../components/UI/Card";
import Button from "../components/UI/Button";
import { ROUTES, ROLES } from "../utils/constants";

const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { role } = useOutletContext() ?? {};

  const actions = [
    {
      title: "Pacientes",
      description: "Consulta y crea expedientes clínicos.",
      to: ROUTES.patients,
    },
    {
      title: "Sesiones",
      description: "Gestiona tu agenda terapéutica.",
      to: ROUTES.sessions,
    },
    {
      title: "Reportes",
      description: "Exporta información NOM-024.",
      to: ROUTES.reports,
    },
  ];

  if (role !== ROLES.ASSISTANT) {
    actions.push({
      title: "Prescripciones",
      description: "Genera y registra prescripciones controladas.",
      to: ROUTES.prescriptions,
    });
  }

  return (
    <section className="page stack-5">
      <div className="page-header">
        <div className="stack-1">
          <h1>Panel general</h1>
          <p className="helper-text">Accesos rápidos a los módulos clínicos.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        {actions.map((action, index) => (
          <motion.div
            key={action.title}
            variants={CARD_VARIANTS}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.25, delay: index * 0.05, ease: "easeOut" }}
          >
            <Card hoverable onClick={() => navigate(action.to)} style={{ cursor: "pointer" }}>
              <CardHeader>
                <h2>{action.title}</h2>
              </CardHeader>
              <CardBody className="stack-2">
                <p>{action.description}</p>
                <Button variant="ghost" size="sm" onClick={() => navigate(action.to)}>
                  Ir ahora
                </Button>
              </CardBody>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card hoverable={false}>
        <CardHeader>
          <h2>Próximos pasos sugeridos</h2>
        </CardHeader>
        <CardBody className="stack-2">
          <p className="helper-text">Optimiza tu flujo clínico con estas recomendaciones:</p>
          <ul className="list">
            <li>Configura consentimientos digitales personalizados para tu equipo.</li>
            <li>Conecta recordatorios SMS/Email para tus sesiones.</li>
            <li>Centraliza adjuntos y notas heredadas en el expediente digital.</li>
          </ul>
        </CardBody>
      </Card>
    </section>
  );
}
