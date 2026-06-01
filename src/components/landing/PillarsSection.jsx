import { motion as Motion } from "framer-motion";
import { Brain, Sparkles, ShieldCheck, Workflow } from "lucide-react";

const PILLARS = [
  {
    icon: Brain,
    title: "Historia clínica completa por especialidad",
    description:
      "Tres modelos de historia (psicológica, psiquiátrica y psicoterapéutica) con el formato propio de cada disciplina. El expediente del paciente reúne todas las miradas.",
  },
  {
    icon: Sparkles,
    title: "Copiloto clínico Romi Transcript",
    description:
      "Transcribe sesiones, propone autollenado del expediente y sugiere intervenciones con base en un corpus cerrado (CIE-11, DSM-5-TR). Tú validas cada paso: ninguna decisión clínica es automática.",
  },
  {
    icon: ShieldCheck,
    title: "NOM-004 + NOM-024 de fábrica",
    description:
      "Expedientes con estructura legal, folios consecutivos, firma digital con sello SHA-256 y trazabilidad completa. Arquitectura multi-tenant: cada profesional ve solo sus pacientes.",
  },
  {
    icon: Workflow,
    title: "Operación híbrida: Modo IA o Manual",
    description:
      "Graba la sesión y deja que Romi Transcript proponga el borrador, o trabaja con clics y menús desplegables. La plataforma se adapta a tu ritmo y estilo clínico.",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function PillarsSection() {
  return (
    <section className="landing-section pillars-section" id="que-es-brevemente">
      <header className="landing-section__header">
        <span className="landing-eyebrow">¿Qué es ROMI Clínica?</span>
        <h2>Un ecosistema clínico, no solo un sistema administrativo</h2>
        <p className="helper-text">
          Construido específicamente para la práctica clínica de salud mental, integra
          metodología, IA controlada y cumplimiento normativo desde el primer día.
        </p>
      </header>
      <Motion.ul
        className="pillars-grid"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
      >
        {PILLARS.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <Motion.li key={pillar.title} className="pillar-card" variants={itemVariants}>
              <span className="pillar-card__icon" aria-hidden="true">
                <Icon size={22} />
              </span>
              <h3 className="pillar-card__title">{pillar.title}</h3>
              <p className="pillar-card__desc">{pillar.description}</p>
            </Motion.li>
          );
        })}
      </Motion.ul>
    </section>
  );
}
