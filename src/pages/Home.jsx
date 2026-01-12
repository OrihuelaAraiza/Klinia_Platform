import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import ButtonPrimary from "../components/ButtonPrimary";
import doctorImg from "../assets/hero/doctor-login.jpg";
import storage from "../services/storage";
import { currentRole } from "../services/authService";
import { ROUTES } from "../utils/constants";

const FEATURES = [
  {
    title: "Expediente unificado",
    description: "Notas clínicas, consentimientos y prescripciones consolidadas en una sola vista.",
  },
  {
    title: "Auditoría continua",
    description: "Todos los eventos críticos quedan registrados para cumplir NOM-004 y NOM-024.",
  },
  {
    title: "Operación en equipo",
    description: "Perfiles para administrativos, profesionales y asistentes con flujos dedicados.",
  },
];

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = storage.getToken();
    const role = currentRole();
    if (token && role) {
      navigate(ROUTES.dashboard, { replace: true });
    }
  }, [navigate]);

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero__content">
          <p className="home-eyebrow">BreveMente Platform</p>
          <h1 className="home-title">Gestión clínica integrada para equipos modernos</h1>
          <p className="home-description">
            Centraliza tus procesos de admisión, sesiones y seguimiento terapéutico con trazabilidad
            completa y cumplimiento normativo. Todo en una experiencia pensada para escritorio y
            dispositivos móviles.
          </p>
          <div className="home-cta">
            <ButtonPrimary as={Link} to={ROUTES.login}>
              Iniciar sesión
            </ButtonPrimary>
            <Link className="link" to={ROUTES.register}>
              Registrarme
            </Link>
          </div>
        </div>
        <div className="home-hero__media">
          <img
            src={doctorImg}
            alt="Profesional clínico consultando la plataforma BreveMente"
            className="home-hero__image"
          />
        </div>
      </section>

      <section className="home-highlights">
        {FEATURES.map((feature) => (
          <article key={feature.title} className="home-highlight">
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
