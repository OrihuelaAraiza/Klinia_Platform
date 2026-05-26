import {
  Brain,
  HeartPulse,
  Moon,
  Users,
  Briefcase,
  Cloud,
  Pill,
  Shield,
} from "lucide-react";

const SPECIALTIES = [
  { icon: Brain, label: "Ansiedad y crisis de pánico" },
  { icon: Cloud, label: "Depresión y trastornos del ánimo" },
  { icon: Briefcase, label: "Estrés laboral y burnout" },
  { icon: Users, label: "Terapia de pareja y familia" },
  { icon: Moon, label: "Insomnio y trastornos del sueño" },
  { icon: HeartPulse, label: "Duelo y procesos de pérdida" },
  { icon: Pill, label: "Adicciones y consumo problemático" },
  { icon: Shield, label: "Trauma y TEPT" },
];

export default function SpecialtiesSection() {
  return (
    <section className="landing-section specialties-section" id="especialidades">
      <header className="landing-section__header">
        <h2>Especialidades que tratamos</h2>
        <p className="helper-text">
          Nuestros profesionales acompañan procesos en una amplia variedad de condiciones.
        </p>
      </header>
      <ul className="specialties-grid">
        {SPECIALTIES.map((item) => {
          const IconComponent = item.icon;
          return (
            <li key={item.label} className="specialty-chip">
              <span className="specialty-chip__icon" aria-hidden="true">
                <IconComponent size={18} />
              </span>
              <span>{item.label}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
