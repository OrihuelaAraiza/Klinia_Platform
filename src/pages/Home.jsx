import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import ButtonPrimary from "../components/ButtonPrimary";
import storage from "../services/storage";
import { currentRole } from "../services/authService";
import { ROUTES } from "../utils/constants";
import HeroDoodle from "../components/landing/HeroDoodle";
import PillarsSection from "../components/landing/PillarsSection";
import BrifiSpotlight from "../components/landing/BrifiSpotlight";
import TbeMethodology from "../components/landing/TbeMethodology";
import TherapistDirectory from "../components/landing/TherapistDirectory";
import HowItWorks from "../components/landing/HowItWorks";
import SpecialtiesSection from "../components/landing/SpecialtiesSection";
import FAQ from "../components/landing/FAQ";
import SelectionFlag from "../components/landing/SelectionFlag";
import TherapistSelectModal from "../components/landing/TherapistSelectModal";
import LandingTopbar from "../components/landing/LandingTopbar";
import LandingFooter from "../components/landing/LandingFooter";
import { Asterisk, Squiggle, Dots, Sparkle, StarBurst, Zigzag } from "../components/landing/doodles/Doodles";
import "../styles/landing-doodle.css";

const heroContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};
const heroItem = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

const sectionReveal = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

function RevealSection({ children, id }) {
  return (
    <Motion.div
      id={id}
      variants={sectionReveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.18 }}
    >
      {children}
    </Motion.div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectionModal, setSelectionModal] = useState({ open: false, therapist: null, role: null });

  useEffect(() => {
    const token = storage.getToken();
    const role = currentRole();
    if (token && role) {
      navigate(ROUTES.dashboard, { replace: true });
    }
  }, [navigate]);

  // Si llegamos con un hash (ej. /#brifi desde otra página), hacemos scroll
  // a esa sección una vez montado el contenido.
  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.replace("#", "");
    // Esperamos un tick para que las secciones lazy/Motion estén montadas
    const t = setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => clearTimeout(t);
  }, [location.hash]);

  const handleSelectTherapist = (therapist, role) => {
    setSelectionModal({ open: true, therapist, role });
  };

  return (
    <div className="home-page">
      <LandingTopbar />
      <SelectionFlag ctaLabel="Continuar al registro" ctaTo="/register/patient" />

      {/* HERO sin imagen, con visual abstracto animado */}
      <section className="home-hero">
        <div className="home-hero__backdrop" aria-hidden="true">
          <div className="home-hero__glow home-hero__glow--a" />
          <div className="home-hero__glow home-hero__glow--b" />
        </div>
        <div className="home-hero__layout">
          <Motion.div
            className="home-hero__content"
            variants={heroContainer}
            initial="hidden"
            animate="visible"
          >
            <Motion.span className="home-eyebrow" variants={heroItem}>
              ROMI TBE · Ecosistema clínico de salud mental
            </Motion.span>
            <Motion.h1 className="home-title" variants={heroItem}>
              Práctica clínica con <span className="home-title__accent">rigor, IA y respaldo NOM-004</span>.
            </Motion.h1>
            <Motion.p className="home-description" variants={heroItem}>
              Construido sobre Terapia Breve Estratégica (TBE), con Brifi —tu copiloto de IA bajo
              corpus cerrado— y arquitectura que cumple NOM-004 y NOM-024 desde el primer día.
              Para pacientes y profesionales que quieren seriedad sin perder agilidad.
            </Motion.p>
            <Motion.div className="home-cta" variants={heroItem}>
              <ButtonPrimary as="a" href="#terapeutas">
                Ver terapeutas disponibles
                <ArrowRight size={16} aria-hidden="true" style={{ marginLeft: 6 }} />
              </ButtonPrimary>
              <Link className="link home-cta__alt" to={ROUTES.login}>Ya tengo cuenta</Link>
            </Motion.div>
            <Motion.ul className="home-hero__badges" variants={heroItem}>
              <li>✓ NOM-004 / NOM-024</li>
              <li>✓ Sello digital SHA-256</li>
              <li>✓ La IA nunca decide sola</li>
            </Motion.ul>
          </Motion.div>

          <Motion.div
            className="home-hero__visual"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <HeroDoodle />
          </Motion.div>
        </div>
      </section>

      {/* Banda de doodles flotantes entre secciones — pura decoración */}
      <div className="home-doodle-float" style={{ top: "8%", left: "3%" }}>
        <Asterisk color="#5B8DEF" size={32} />
      </div>
      <div className="home-doodle-float" style={{ top: "26%", right: "4%" }}>
        <Squiggle color="#FFC93C" size={70} />
      </div>
      <div className="home-doodle-float" style={{ top: "44%", left: "2%" }}>
        <Dots color="#1A1A1A" size={70} style={{ opacity: 0.4 }} />
      </div>
      <div className="home-doodle-float" style={{ top: "60%", right: "5%" }}>
        <Sparkle color="#1A1A1A" size={30} />
      </div>
      <div className="home-doodle-float" style={{ top: "72%", left: "4%" }}>
        <StarBurst color="#FFAFCC" stroke="#1A1A1A" size={42} />
      </div>
      <div className="home-doodle-float" style={{ top: "82%", right: "3%" }}>
        <Zigzag color="#5B8DEF" size={65} />
      </div>

      <RevealSection><PillarsSection /></RevealSection>

      <RevealSection><BrifiSpotlight /></RevealSection>

      <RevealSection><HowItWorks /></RevealSection>

      <RevealSection><TherapistDirectory onSelectTherapist={handleSelectTherapist} /></RevealSection>

      <RevealSection><TbeMethodology /></RevealSection>

      <RevealSection><SpecialtiesSection /></RevealSection>

      <RevealSection><FAQ /></RevealSection>

      <Motion.section
        className="home-cta-final"
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5 }}
      >
        <div className="stack-2" style={{ alignItems: "center", textAlign: "center" }}>
          <h2>¿Eres profesional de la salud mental?</h2>
          <p className="helper-text">Únete a la plataforma y administra tu práctica clínica con respaldo NOM-004 y Brifi a tu lado.</p>
          <ButtonPrimary as={Link} to={ROUTES.register}>
            Registrarme como profesional
            <ArrowRight size={16} aria-hidden="true" style={{ marginLeft: 6 }} />
          </ButtonPrimary>
        </div>
      </Motion.section>

      <TherapistSelectModal
        open={selectionModal.open}
        onClose={() => setSelectionModal({ open: false, therapist: null, role: null })}
        therapist={selectionModal.therapist}
        role={selectionModal.role}
      />

      <LandingFooter />
    </div>
  );
}
