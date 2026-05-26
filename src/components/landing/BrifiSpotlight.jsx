import { motion as Motion } from "framer-motion";
import { Sparkles, ShieldCheck, BookOpen, UserCheck, Lock } from "lucide-react";

const GUARDRAILS = [
  {
    icon: BookOpen,
    title: "Corpus cerrado",
    description: "Brifi solo opera sobre una biblioteca curada de protocolos oficiales (CIE-11, DSM-5-TR). Cero alucinaciones clínicas.",
  },
  {
    icon: UserCheck,
    title: "Tú siempre validas",
    description: "La IA no cierra expedientes ni firma reportes por sí sola. Cada propuesta debe ser aprobada por el clínico.",
  },
  {
    icon: Lock,
    title: "No entrena con tus datos",
    description: "Tus pacientes no se utilizan para entrenar modelos abiertos. Privacidad garantizada por arquitectura.",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.1 },
  }),
};

export default function BrifiSpotlight() {
  return (
    <section className="landing-section brifi-section" id="brifi">
      <Motion.div
        className="brifi-spotlight"
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="brifi-spotlight__main">
          <span className="brifi-spotlight__eyebrow">
            <Sparkles size={14} aria-hidden="true" /> Copiloto clínico
          </span>
          <h2 className="brifi-spotlight__title">
            Conoce a <span className="brifi-spotlight__brand">Brifi</span>, tu copiloto clínico
          </h2>
          <p className="brifi-spotlight__desc">
            Brifi escucha la sesión, transcribe y propone el llenado estructurado del expediente.
            Tú revisas, ajustas y apruebas. Pensado para liberarte de la carga administrativa sin
            comprometer el rigor clínico ni la privacidad de tus pacientes.
          </p>
          <Motion.div
            className="brifi-bubble"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="brifi-bubble__head">
              <Sparkles size={14} aria-hidden="true" />
              <strong>Brifi sugiere</strong>
            </div>
            <p>
              "El paciente reporta crisis de pánico nocturnas y evita situaciones sociales. Sugiero:
              aplicar PDSS y considerar prescripción paradójica enfocada en exposición controlada."
            </p>
            <div className="brifi-bubble__actions">
              <span className="brifi-bubble__btn brifi-bubble__btn--ok">
                <ShieldCheck size={12} /> Aceptar y registrar
              </span>
              <span className="brifi-bubble__btn">Modificar</span>
              <span className="brifi-bubble__btn brifi-bubble__btn--ghost">Descartar</span>
            </div>
          </Motion.div>
        </div>

        <div className="brifi-spotlight__guardrails">
          <span className="helper-text" style={{ textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
            Diseñada con guardarraíles clínicos
          </span>
          <ul className="brifi-guardrails-list">
            {GUARDRAILS.map((g, i) => {
              const Icon = g.icon;
              return (
                <Motion.li
                  key={g.title}
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className="brifi-guardrail"
                >
                  <span className="brifi-guardrail__icon" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <div>
                    <strong>{g.title}</strong>
                    <p>{g.description}</p>
                  </div>
                </Motion.li>
              );
            })}
          </ul>
        </div>
      </Motion.div>
    </section>
  );
}
