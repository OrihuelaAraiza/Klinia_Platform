import React, { useMemo } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { ROUTES } from '../utils/constants'; 
// Asumo que tienes un componente para los iconos
// import { CalendarIcon, HeartIcon, DocumentIcon } from 'lucide-react'; 

export default function PatientDashboard() {
  
  // Obtenemos el usuario logueado del ProtectedRoute (esto ya funciona)
  const { user } = useOutletContext(); 
  
  const firstName = user?.name?.split(' ')[0] || 'Paciente';
  if (!user) {
      return <div className="page dashboard-page">Cargando perfil...</div>; 
  }

  const welcomeMessage = `Bienvenido, ${firstName}. Revisa tu estado de salud y próximas citas.`;

  // Módulos rápidos (reutilizamos las clases de tarjetas)
  const quickLinks = useMemo(() => [
    { 
      title: "Próxima Cita", 
      icon: "CalendarIcon", // Placeholder
      description: "Agenda o confirma tu próxima sesión con tu especialista.",
      link: ROUTES.sessions, 
      status: 'Programada' // Simulación
    },
    { 
      title: "Historial Médico", 
      icon: "HeartIcon",
      description: "Accede a tus notas clínicas y padecimientos registrados.",
      link: ROUTES.history, 
      status: 'Completo'
    },
    { 
      title: "Documentos KYC", 
      icon: "DocumentIcon",
      description: "Revisa el estado de tus validaciones de identidad.",
      link: '/profile/documents', 
      status: 'Validado' 
    },
  ], []);


  return (
    <div className="page dashboard-page">
      <header className="page__header">
        <div className="dashboard-header__intro">
          <h1 className="dashboard-page__title">{welcomeMessage}</h1>
          <p className="dashboard-page__subtitle">
            Tu centro de control de salud digital.
          </p>
        </div>
      </header>

      {/* --- Grilla de Módulos Rápidos (usa tu clase de tarjetas) --- */}
      <div className="dashboard-grid">
        
        {quickLinks.map((item, index) => (
          <Link key={index} to={item.link} className="stat-card stat-card--clickable">
            <div className="stat-icon">{/* Icono aquí */}</div>
            <div className="stat-content">
              <p className="stat-label">{item.title}</p>
              <h2 className="stat-value" style={{fontSize: '1.5rem'}}>{item.status}</h2>
              <p className="stat-subtext">{item.description}</p>
            </div>
          </Link>
        ))}

        {/* --- Card de Bienvenida --- */}
        <div className="ui-card" style={{ gridColumn: '1 / -1', borderLeft: '4px solid var(--accent)' }}>
          <h3 className="ui-card__title">Tu Expediente</h3>
          <p className="ui-card__body-text">
            Recuerda que tus datos de identidad están validados, pero si tienes 
            algún cambio en tu historial médico (alergias, medicamentos), 
            puedes actualizarlo en tu perfil.
          </p>
          <Link to="/profile/medical" className="ui-card__footer-link link--button">
              Ir a mi Perfil
          </Link>
        </div>

      </div>
    </div>
  );
}