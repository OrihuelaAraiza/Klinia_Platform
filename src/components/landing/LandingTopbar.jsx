import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, ExternalLink } from "lucide-react";
import Logo from "../Brand/Logo";

const ROMI_AI_URL = "https://romiai.com.mx/";

const NAV_LINKS = [
  { hash: "que-es-brevemente", label: "¿Qué es?" },
  { hash: "romi-transcript", label: "Romi Transcript (IA)" },
  { hash: "como-funciona", label: "Cómo funciona" },
  { hash: "terapeutas", label: "Terapeutas" },
  { hash: "metodologia-tbe", label: "Metodología TBE" },
  { hash: "faq", label: "FAQ" },
];

function SectionLink({ hash, label, onAfterClick }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleClick = (e) => {
    e.preventDefault();
    if (location.pathname === "/") {
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.replaceState(null, "", `#${hash}`);
      }
    } else {
      navigate(`/#${hash}`);
    }
    if (onAfterClick) onAfterClick();
  };

  return (
    <a href={`/#${hash}`} onClick={handleClick}>{label}</a>
  );
}

export default function LandingTopbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMobile = () => setMobileOpen(false);

  return (
    <header
      className={`landing-topbar${scrolled ? " is-scrolled" : ""}${mobileOpen ? " is-open" : ""}`}
      role="banner"
    >
      <div className="landing-topbar__inner">
        <div className="landing-topbar__brand">
          <Link
            to="/"
            className="landing-topbar__brand-link"
            aria-label="Ir al inicio de ROMI TBE"
            onClick={closeMobile}
          >
            <Logo
              variant="horizontal"
              size="sm"
              theme="auto"
              alt="ROMI"
              className="landing-topbar__logo"
            />
            <span className="landing-topbar__product">TBE</span>
          </Link>
          <a
            href={ROMI_AI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="landing-topbar__powered"
            aria-label="Visita romiai.com.mx"
            title="Visita romiai.com.mx"
          >
            romiai.com.mx <ExternalLink size={11} aria-hidden="true" />
          </a>
        </div>

        <nav className="landing-topbar__nav" aria-label="Navegación de secciones">
          <ul>
            {NAV_LINKS.map((link) => (
              <li key={link.hash}>
                <SectionLink hash={link.hash} label={link.label} onAfterClick={closeMobile} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="landing-topbar__actions">
          <Link to="/login" className="landing-topbar__btn landing-topbar__btn--ghost" onClick={closeMobile}>
            Iniciar sesión
          </Link>
          <Link to="/register/patient" className="landing-topbar__btn landing-topbar__btn--primary" onClick={closeMobile}>
            Crear cuenta
          </Link>
        </div>

        <button
          type="button"
          className="landing-topbar__toggle"
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </div>

      {/* Drawer mobile */}
      <div className="landing-topbar__mobile" aria-hidden={!mobileOpen}>
        <ul className="landing-topbar__mobile-nav">
          {NAV_LINKS.map((link) => (
            <li key={link.hash}>
              <SectionLink hash={link.hash} label={link.label} onAfterClick={closeMobile} />
            </li>
          ))}
        </ul>
        <div className="landing-topbar__mobile-actions">
          <Link to="/login" className="landing-topbar__btn landing-topbar__btn--ghost" onClick={closeMobile}>
            Iniciar sesión
          </Link>
          <Link to="/register/patient" className="landing-topbar__btn landing-topbar__btn--primary" onClick={closeMobile}>
            Crear cuenta
          </Link>
          <a
            href={ROMI_AI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="landing-topbar__mobile-external"
          >
            Visita Romi AI <ExternalLink size={12} aria-hidden="true" />
          </a>
        </div>
      </div>
    </header>
  );
}
