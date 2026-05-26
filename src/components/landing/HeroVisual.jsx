import { motion as Motion } from "framer-motion";
import { Sparkles, ShieldCheck, FileSignature, Brain } from "lucide-react";

/**
 * Visual abstracto del hero: tres cards flotantes que representan los
 * momentos clave de la plataforma — diagnóstico TBE, copiloto Brifi y
 * constancia firmada. Cada tarjeta tiene una animación de flotación con
 * desfases ligeramente distintos para sensación viva sin distraer.
 */
const floatTransition = (delay = 0) => ({
  duration: 4.5,
  repeat: Infinity,
  repeatType: "mirror",
  ease: "easeInOut",
  delay,
});

export default function HeroVisual() {
  return (
    <div className="hero-visual" aria-hidden="true">
      <div className="hero-visual__orb" />
      <div className="hero-visual__grid" />

      <Motion.div
        className="hero-card hero-card--dx"
        initial={{ opacity: 0, x: 30, y: 30 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Motion.div animate={{ y: [0, -8, 0] }} transition={floatTransition(0)}>
          <div className="hero-card__head">
            <span className="hero-card__icon hero-card__icon--accent"><Brain size={16} /></span>
            <span className="hero-card__title">Diagnóstico estratégico</span>
          </div>
          <div className="hero-card__row">
            <span className="hero-card__label">DX.OP</span>
            <span className="hero-card__value">F41.1 · Ansiedad generalizada</span>
          </div>
          <div className="hero-card__row">
            <span className="hero-card__label">VC</span>
            <span className="hero-card__bar">
              <span style={{ width: "62%" }} />
            </span>
          </div>
        </Motion.div>
      </Motion.div>

      <Motion.div
        className="hero-card hero-card--brifi"
        initial={{ opacity: 0, x: -30, y: 50 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <Motion.div animate={{ y: [0, 8, 0] }} transition={floatTransition(0.8)}>
          <div className="hero-card__head">
            <span className="hero-card__icon hero-card__icon--ai"><Sparkles size={16} /></span>
            <span className="hero-card__title">Brifi sugiere</span>
            <span className="hero-card__tag">IA</span>
          </div>
          <p className="hero-card__quote">
            "Detecté ansiedad anticipatoria + insomnio. Sugiero aplicar GAD-7 y prescripción paradójica."
          </p>
          <div className="hero-card__actions">
            <span className="hero-card__chip">Aceptar</span>
            <span className="hero-card__chip hero-card__chip--ghost">Modificar</span>
          </div>
        </Motion.div>
      </Motion.div>

      <Motion.div
        className="hero-card hero-card--cert"
        initial={{ opacity: 0, x: 20, y: 70 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      >
        <Motion.div animate={{ y: [0, -6, 0] }} transition={floatTransition(1.6)}>
          <div className="hero-card__head">
            <span className="hero-card__icon hero-card__icon--ok"><FileSignature size={16} /></span>
            <span className="hero-card__title">Constancia firmada</span>
          </div>
          <div className="hero-card__row hero-card__row--folio">
            <span className="hero-card__label">Folio</span>
            <span className="hero-card__value mono">REP-2025-0042</span>
          </div>
          <div className="hero-card__row">
            <span className="hero-card__label">SHA-256</span>
            <span className="hero-card__value mono ellipsis">a91f3c…2d8b</span>
          </div>
          <div className="hero-card__verified">
            <ShieldCheck size={12} /> NOM-004 · Auditable
          </div>
        </Motion.div>
      </Motion.div>
    </div>
  );
}
