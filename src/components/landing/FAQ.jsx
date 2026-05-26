import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "¿La información que comparto es privada?",
    a: "Sí. Tu expediente clínico está protegido bajo la NOM-004 y solo es visible para ti y el profesional con quien te vinculas. Todos los reportes generados llevan un sello digital SHA-256 que garantiza su autenticidad e inalterabilidad.",
  },
  {
    q: "¿Las sesiones son presenciales o virtuales?",
    a: "Depende de cada terapeuta. En cada perfil verás la modalidad disponible (presencial, virtual o mixta). Puedes filtrar el directorio por la modalidad que prefieras.",
  },
  {
    q: "¿Qué pasa si mi primera opción no acepta o no tiene disponibilidad?",
    a: "Por eso puedes registrar una segunda opción al momento de vincularte. Si tu opción principal no responde o rechaza la solicitud, automáticamente revisamos contigo la opción de respaldo.",
  },
  {
    q: "¿Quién puede prescribir medicamentos?",
    a: "Solo los psiquiatras (médicos cirujanos con especialidad en psiquiatría) están autorizados para prescribir psicofármacos. Los psicólogos y psicoterapeutas brindan evaluación, diagnóstico psicométrico y psicoterapia, pero no emiten recetas.",
  },
  {
    q: "¿Puedo cambiar de terapeuta más adelante?",
    a: "Por supuesto. Desde tu portal de paciente puedes solicitar una nueva vinculación o terminar la actual. Tu expediente clínico se conserva y se comparte con el nuevo profesional solo si tú lo autorizas.",
  },
  {
    q: "¿Cuánto cuesta una sesión?",
    a: "Los honorarios se acuerdan directamente con cada profesional al momento de aceptar tu vinculación. Cada terapeuta define su tarifa según especialidad, duración y modalidad.",
  },
];

function FaqItem({ q, a, isOpen, onToggle }) {
  return (
    <li className={`faq-item${isOpen ? " is-open" : ""}`}>
      <button
        type="button"
        className="faq-item__question"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span>{q}</span>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className="faq-item__chevron"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
        />
      </button>
      {isOpen ? <div className="faq-item__answer"><p>{a}</p></div> : null}
    </li>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);
  return (
    <section className="landing-section faq-section" id="faq">
      <header className="landing-section__header">
        <h2>Preguntas frecuentes</h2>
        <p className="helper-text">Lo que más nos preguntan antes de empezar.</p>
      </header>
      <ul className="faq-list">
        {FAQS.map((item, idx) => (
          <FaqItem
            key={item.q}
            q={item.q}
            a={item.a}
            isOpen={openIndex === idx}
            onToggle={() => setOpenIndex((current) => (current === idx ? -1 : idx))}
          />
        ))}
      </ul>
    </section>
  );
}
