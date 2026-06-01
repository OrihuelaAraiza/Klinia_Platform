import { Link, useLocation, useNavigate } from "react-router-dom";
import { Mail, Phone, MapPin, Clock, Instagram, Linkedin, Facebook, ExternalLink } from "lucide-react";
import Logo from "../Brand/Logo";

const ROMI_AI_URL = "https://romiai.com.mx/";

const SECTIONS = {
  platform: [
    { hash: "que-es-brevemente", label: "¿Qué es ROMI TBE?" },
    { hash: "romi-transcript", label: "Romi Transcript (copiloto IA)" },
    { hash: "metodologia-tbe", label: "Metodología TBE" },
    { hash: "faq", label: "Preguntas frecuentes" },
  ],
  product: [
    { hash: "terapeutas", label: "Directorio de terapeutas" },
    { href: "/register/patient", label: "Crear cuenta paciente", internal: true },
    { href: "/register", label: "Soy profesional", internal: true },
    { href: "/login", label: "Iniciar sesión", internal: true },
  ],
};

const SOCIALS = [
  {
    href: "https://www.instagram.com/ajolomed.romi?igsh=MWdzaXZsbGVnb21uMA%3D%3D",
    label: "Instagram",
    icon: Instagram,
  },
  {
    href: "https://www.linkedin.com/company/romiasistentemedicovirtualinteligente/posts/?feedView=all",
    label: "LinkedIn",
    icon: Linkedin,
  },
  {
    href: "https://www.facebook.com/people/ROMI-asistente-inteligente/61573823379860/",
    label: "Facebook",
    icon: Facebook,
  },
];

function SectionAnchor({ hash, label }) {
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
  };
  return <a href={`/#${hash}`} onClick={handleClick}>{label}</a>;
}

export default function LandingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="landing-footer" role="contentinfo">
      <div className="landing-footer__main">
        {/* Brand */}
        <div className="landing-footer__col landing-footer__col--brand">
          <Link to="/" className="landing-footer__brand-link" aria-label="Inicio de ROMI TBE">
            <Logo
              variant="horizontal"
              size="md"
              theme="dark"
              alt="ROMI"
              className="landing-footer__logo"
            />
            <span className="landing-footer__product">TBE</span>
          </Link>
          <p className="landing-footer__tagline">
            Plataforma clínica de salud mental de <strong>Romi AI</strong>. Construida con
            Terapia Breve Estratégica y cumplimiento NOM-004 / NOM-024.
          </p>
          <a
            href={ROMI_AI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="landing-footer__external"
          >
            Visita romiai.com.mx <ExternalLink size={12} aria-hidden="true" />
          </a>
        </div>

        {/* Plataforma */}
        <div className="landing-footer__col">
          <h4>Plataforma</h4>
          <ul>
            {SECTIONS.platform.map((item) => (
              <li key={item.hash}><SectionAnchor hash={item.hash} label={item.label} /></li>
            ))}
          </ul>
        </div>

        {/* Producto */}
        <div className="landing-footer__col">
          <h4>Producto</h4>
          <ul>
            {SECTIONS.product.map((item) => (
              <li key={item.label}>
                {item.internal ? (
                  <Link to={item.href}>{item.label}</Link>
                ) : (
                  <SectionAnchor hash={item.hash} label={item.label} />
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Contacto */}
        <div className="landing-footer__col">
          <h4>Contacto</h4>
          <ul className="landing-footer__contact">
            <li>
              <Mail size={14} aria-hidden="true" />
              <a href="mailto:contacto@romiai.com.mx">contacto@romiai.com.mx</a>
            </li>
            <li>
              <Phone size={14} aria-hidden="true" />
              <a href="tel:+522224335093">22 24 33 50 93</a>
            </li>
            <li className="landing-footer__hours">
              <Clock size={14} aria-hidden="true" />
              <div>
                <strong>Horario de atención</strong>
                <span>Lun – Vie: 9:00 AM – 6:00 PM (GMT-6)</span>
                <span>Sáb: 10:00 AM – 2:00 PM (GMT-6)</span>
              </div>
            </li>
          </ul>
        </div>

        {/* Dirección */}
        <div className="landing-footer__col">
          <h4>Dirección</h4>
          <address className="landing-footer__address">
            <MapPin size={14} aria-hidden="true" />
            <div>
              <strong>Hospital Ángeles Puebla</strong>
              <span>Av. Kepler No. 2143</span>
              <span>Torre de Especialidades IV, Consultorio 3800</span>
              <span>CP 72820, Reserva Territorial Atlixcáyotl</span>
              <span>Puebla, Pue.</span>
            </div>
          </address>
        </div>

        {/* Síguenos */}
        <div className="landing-footer__col landing-footer__col--follow">
          <h4>Síguenos</h4>
          <p className="landing-footer__follow-text">
            Entérate de novedades, próximas funcionalidades y datos curiosos.
          </p>
          <ul className="landing-footer__socials">
            {SOCIALS.map((s) => {
              const Icon = s.icon;
              return (
                <li key={s.label}>
                  <a href={s.href} aria-label={s.label} target="_blank" rel="noopener noreferrer">
                    <Icon size={18} aria-hidden="true" />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="landing-footer__bottom">
        <p className="landing-footer__copy">
          © {year} Red de Optimización Médica Inteligente, S.A. de C.V. · Todos los derechos reservados.
        </p>
        <ul className="landing-footer__legal">
          <li><Link to="/aviso-privacidad">Aviso de Privacidad</Link></li>
          <li><Link to="/terminos">Términos y Condiciones</Link></li>
        </ul>
      </div>
    </footer>
  );
}
