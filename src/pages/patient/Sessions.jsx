import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { listSessionsByPatient } from "../../services/sessionsService";
import { formatDateISOToHuman } from "../../utils/formatters";
import Card, { CardHeader, CardBody } from "../../components/UI/Card";
import Badge from "../../components/UI/Badge";
import Button from "../../components/UI/Button";
import { useToast } from "../../components/UI/Toast";
import { SkeletonTitle, SkeletonList } from "../../components/UI/Skeleton";
import EmptyState from "../../components/UI/EmptyState";
import { Calendar, Printer, Clock, MapPin, User } from "lucide-react";
import {
  SESSION_STATUS,
  SESSION_STATUS_LABEL,
  SESSION_STATUS_VARIANT,
  SESSION_MODALITY_LABEL,
} from "../../utils/constants";
import "./pdf.css";

export default function PatientSessions() {
  const { user } = useOutletContext() ?? {};
  const toast = useToast();
  const patientId = user?.id;

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!patientId) return;

    let alive = true;
    async function load() {
      setLoading(true);
      try {
        const response = await listSessionsByPatient(patientId);
        if (!alive) return;
        
        // Normalización de la respuesta del servicio
        const items = Array.isArray(response) ? response : (response?.items || []);
        setSessions(items);
      } catch (err) {
        if (!alive) return;
        setError("No pudimos cargar tus sesiones.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [patientId]);

  // Filtrado de sesiones por estado temporal
  const upcomingSessions = sessions.filter(s => 
    s.status === SESSION_STATUS.PROGRAMADA || s.status === SESSION_STATUS.CONFIRMADA
  );
  
  const pastSessions = sessions.filter(s => 
    s.status !== SESSION_STATUS.PROGRAMADA && s.status !== SESSION_STATUS.CONFIRMADA
  );

  if (loading) {
    return (
      <section className="page stack-5">
        <SkeletonTitle />
        <SkeletonList count={3} />
      </section>
    );
  }

  return (
    <section className="page stack-5 print-container">
      {/* CABECERA TÉCNICA: Solo se activa en el PDF  */}
      <div className="show-only-print">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '24pt', margin: 0 }}>AGENDA DE SESIONES</h1>
          <p style={{ fontSize: '12pt', color: '#666' }}>Plataforma Clínica BreveMente</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '1rem' }}>
          <span><strong>Paciente:</strong> {user?.firstName} {user?.lastName}</span>
          <span><strong>Fecha de Reporte:</strong> {new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* HEADER DE PANTALLA: Se oculta al imprimir [cite: 18] */}
      <div className="page__header cluster no-print">
        <div className="stack-2">
          <h1>Mis Sesiones</h1>
          <p className="helper-text">Gestiona tus próximas citas e historial terapéutico.</p>
        </div>
        <button className="button button--ghost" onClick={() => window.print()} type="button">
          <Printer size={18} /> 
          <span className="hide-mobile">Imprimir Agenda</span>
        </button>
      </div>

      {sessions.length === 0 ? (
        <Card hoverable={false} className="no-print">
          <CardBody>
            <EmptyState
              icon={Calendar}
              title="Aún no tienes sesiones"
              message="Cuando tu profesional de salud programe una cita, aparecerá aquí con los detalles."
            />
          </CardBody>
        </Card>
      ) : (
        <div className="stack-6">
          {/* SECCIÓN: PRÓXIMAS CITAS */}
          {upcomingSessions.length > 0 && (
            <div className="stack-3 print-section">
              <h2 className="cluster no-print">
                <Clock size={20} color="var(--primary)" /> Próximas Citas
              </h2>
              <div className="grid-print">
                {upcomingSessions.map(session => (
                  <Card key={session.id} className="print-card border-accent">
                    <CardHeader className="cluster-print" style={{ justifyContent: 'space-between' }}>
                      <div className="stack-1">
                        <strong className="print-date text-lg">
                          {formatDateISOToHuman(session.datetime)}
                        </strong>
                        <div className="cluster gap-1 helper-text print-subtitle">
                          <MapPin size={14} className="no-print" /> 
                          {SESSION_MODALITY_LABEL[session.modality]}
                        </div>
                      </div>
                      <div className="print-badge-container">
                        <Badge variant={SESSION_STATUS_VARIANT[session.status]}>
                          {SESSION_STATUS_LABEL[session.status]}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardBody className="stack-3 print-body">
                      <p className="print-info">
                        <User size={16} className="no-print inline-icon" />
                        <strong>Especialista:</strong> {session.professional?.name}
                      </p>
                      {session.notes && (
                        <div className="print-notes-box">
                          <p className="helper-text"><strong>Notas:</strong> {session.notes}</p>
                        </div>
                      )}
                      <div className="cluster gap-2 no-print" style={{ marginTop: '1rem' }}>
                        <Button size="sm" onClick={() => toast.info("Funcionalidad en desarrollo")}>
                          Confirmar Asistencia
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* SECCIÓN: HISTORIAL */}
          {pastSessions.length > 0 && (
            <div className="stack-3 print-section">
              <h2 className="helper-text print-title-past">Historial de Sesiones</h2>
              <div className="stack-2">
                {pastSessions.map(session => (
                  <Card key={session.id} hoverable={false} className="card--sm print-card-mini">
                    <CardBody className="cluster-print" style={{ justifyContent: 'space-between' }}>
                      <div className="cluster gap-4 print-data-row">
                        <div className="stack-0">
                          <strong className="print-main-text">
                            {new Date(session.datetime).toLocaleDateString()}
                          </strong>
                          <span className="helper-text small no-print">
                            {new Date(session.datetime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <div className="stack-0">
                          <span className="text-sm print-secondary-text">
                            {session.professional?.name}
                          </span>
                          <span className="helper-text small print-sub-text">
                            {SESSION_MODALITY_LABEL[session.modality]}
                          </span>
                        </div>
                      </div>
                      <div className="print-status-label">
                         <Badge variant={SESSION_STATUS_VARIANT[session.status]} size="sm">
                            {SESSION_STATUS_LABEL[session.status]}
                         </Badge>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PIE DE PÁGINA: Solo en PDF [cite: 31, 34] */}
      <footer className="show-only-print" style={{ marginTop: '3rem', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
        <p style={{ fontSize: '9pt', color: '#999' }}>
          Documento generado automáticamente por BreveMente. 
          Válido para fines informativos del paciente.
        </p>
      </footer>
    </section>
  );
}