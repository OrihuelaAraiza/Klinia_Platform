import { Search, UserCheck, ClipboardEdit, CalendarCheck } from "lucide-react";

const STEPS = [
  {
    icon: Search,
    title: "Explora terapeutas",
    description: "Revisa perfiles, especialidades y modalidades. Filtra por psiquiatría, psicología o psicoterapia.",
  },
  {
    icon: UserCheck,
    title: "Elige una opción (y una de respaldo)",
    description: "Marca al profesional con quien quieres iniciar tu proceso. Puedes seleccionar una segunda opción por si la primera no tiene cupo.",
  },
  {
    icon: ClipboardEdit,
    title: "Crea tu cuenta",
    description: "Regístrate como paciente. Tu selección se mantiene visible en todo el flujo de registro.",
  },
  {
    icon: CalendarCheck,
    title: "Comienza tu proceso",
    description: "El terapeuta recibe tu solicitud y, al aceptarla, agenda tu primera sesión presencial o virtual.",
  },
];

export default function HowItWorks() {
  return (
    <section className="landing-section how-it-works" id="como-funciona">
      <header className="landing-section__header">
        <h2>Cómo funciona</h2>
        <p className="helper-text">En cuatro pasos cortos estás conectado con el profesional indicado.</p>
      </header>
      <ol className="how-it-works__steps">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          return (
            <li key={step.title} className="how-it-works__step">
              <span className="how-it-works__index">{idx + 1}</span>
              <div className="how-it-works__icon" aria-hidden="true">
                <Icon size={22} />
              </div>
              <h3 className="how-it-works__title">{step.title}</h3>
              <p className="how-it-works__desc">{step.description}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
