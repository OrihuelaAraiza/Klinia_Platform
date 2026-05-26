import { motion as Motion } from "framer-motion";
import { Target, LineChart, Repeat, ClipboardList } from "lucide-react";

const MODULES = [
  {
    icon: Target,
    code: "DX.OP",
    title: "Diagnóstico estratégico",
    description:
      "Define el problema, identifica el Sistema Perceptivo Reactivo (SPR) que lo mantiene y traza objetivos terapéuticos medibles.",
  },
  {
    icon: LineChart,
    code: "VC + VG",
    title: "Valoración del cambio",
    description:
      "Mide la evolución del paciente consigo mismo, con los demás y con el mundo. Datos longitudinales y gráficas de progreso.",
  },
  {
    icon: Repeat,
    code: "RST",
    title: "Reestructuraciones",
    description:
      "Registra las reestructuraciones aplicadas en cada sesión con marca temporal y vinculadas al hilo terapéutico.",
  },
  {
    icon: ClipboardList,
    code: "PX",
    title: "Prescripciones terapéuticas",
    description:
      "Documenta tareas, paradojas y prescripciones de sesión. Hasta 20 PX por encuentro con flags OSS / ADD / RSS.",
  },
];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function TbeMethodology() {
  return (
    <section className="landing-section tbe-section" id="metodologia-tbe">
      <header className="landing-section__header">
        <span className="landing-eyebrow">Metodología TBE nativa</span>
        <h2>Los módulos que tu práctica clínica necesita</h2>
        <p className="helper-text">
          Cada módulo está diseñado siguiendo el marco de la Terapia Breve Estratégica. Si no
          trabajas con TBE, también te sirve: la estructura te ayuda a organizar evidencia clínica.
        </p>
      </header>
      <Motion.ul
        className="tbe-modules-grid"
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          return (
            <Motion.li key={mod.code} className="tbe-module-card" variants={item}>
              <div className="tbe-module-card__head">
                <span className="tbe-module-card__icon" aria-hidden="true">
                  <Icon size={20} />
                </span>
                <span className="tbe-module-card__code">{mod.code}</span>
              </div>
              <h3 className="tbe-module-card__title">{mod.title}</h3>
              <p className="tbe-module-card__desc">{mod.description}</p>
            </Motion.li>
          );
        })}
      </Motion.ul>
    </section>
  );
}
