import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import auditService from "../services/auditService";
import storage from "../services/storage";
import { ROUTES } from "../utils/constants";

const STORAGE_KEY = "dashboard.nextSteps";

const STEPS = [
  {
    id: "consents",
    title: "Configura consentimientos digitales personalizados para tu equipo.",
    to: ROUTES.consents,
    linkLabel: "Ir a consentimientos",
  },
  {
    id: "reminders",
    title: "Conecta recordatorios SMS/Email para tus sesiones.",
    to: `${ROUTES.sessions}?filter=needsReminder`,
    linkLabel: "Gestionar recordatorios",
  },
  {
    id: "attachments",
    title: "Centraliza adjuntos y notas heredadas en el expediente digital.",
    to: ROUTES.patients,
    linkLabel: "Ver pacientes",
  },
];

function readStoredState() {
  const stored = storage.getObject(STORAGE_KEY, {});
  return typeof stored === "object" && stored !== null ? stored : {};
}

function persistState(state) {
  storage.setObject(STORAGE_KEY, state);
}

export default function NextSteps() {
  const [checked, setChecked] = useState(() => readStoredState());

  useEffect(() => {
    setChecked(readStoredState());
  }, []);

  const items = useMemo(
    () =>
      STEPS.map((step) => ({
        ...step,
        completed: Boolean(checked[step.id]),
      })),
    [checked]
  );

  const toggleStep = (id) => {
    setChecked((prev) => {
      const nextValue = !prev[id];
      const next = { ...prev, [id]: nextValue };
      persistState(next);
      auditService.logAudit("dashboard_nextstep_check", { key: id, value: nextValue });
      return next;
    });
  };

  return (
    <div className="dashboard-module dashboard-module--static">
      <h2 className="dashboard-page__section-title">Próximos pasos sugeridos</h2>
      <p className="dashboard-page__subtitle">
        Optimiza tu flujo clínico con estas recomendaciones:
      </p>
      <ul className="dashboard-suggestions" role="list">
        {items.map((item) => (
          <li key={item.id}>
            <label className="dashboard-suggestion">
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => toggleStep(item.id)}
              />
              <span
                className="dashboard-suggestion__status"
                data-completed={item.completed}
                aria-hidden="true"
              >
                {item.completed ? "✓" : ""}
              </span>
              <span className="dashboard-suggestion__text">
                {item.title}{" "}
                <Link to={item.to} className="dashboard-suggestion__link">
                  {item.linkLabel}
                </Link>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
