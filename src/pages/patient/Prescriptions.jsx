import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { listMyPrescriptions } from "../../services/prescriptionsService";
import { formatDateISOToHuman } from "../../utils/formatters";
import Card, { CardHeader, CardBody } from "../../components/UI/Card";
import Badge from "../../components/UI/Badge";
import Button from "../../components/UI/Button";
import { useToast } from "../../components/UI/Toast";
import { SkeletonTitle, SkeletonList } from "../../components/UI/Skeleton";
import EmptyState from "../../components/UI/EmptyState";
import { Pill, Printer, FileText, Activity } from "lucide-react";
import "./pdf.css"; 

/**
 * Vista de Prescripciones para el Portal del Paciente.
 * Permite visualizar el historial de recetas y las indicaciones activas.
 */
export default function PatientPrescriptions() {
  const { user } = useOutletContext() ?? {};
  const toast = useToast();
  
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        // Llama al servicio que usa el token del paciente
        const response = await listMyPrescriptions();
        if (!alive) return;
        
        const items = Array.isArray(response) ? response : [];
        // Ordenamos: Activas arriba, luego por fecha de creación
        const sorted = items.sort((a, b) => {
          if (a.suspended !== b.suspended) return a.suspended ? 1 : -1;
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
        
        setPrescriptions(sorted);
      } catch (err) {
        if (!alive) return;
        setError("No pudimos cargar tus prescripciones.");
        toast.error("Error al conectar con el servidor.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [toast]);

  const activePrescriptions = prescriptions.filter((p) => !p.suspended && !p.completed);
  const inactivePrescriptions = prescriptions.filter((p) => p.suspended || p.completed);

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
      <div className="show-only-print">
        <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '1rem', marginBottom: '2rem' }}>
          <h1>INDICACIONES MÉDICAS Y PRESCRIPCIONES</h1>
          <p>Plataforma Clínica BreveMente</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <span><strong>Paciente:</strong> {user?.firstName} {user?.lastName}</span>
          <span><strong>Fecha de consulta:</strong> {new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* HEADER DE PANTALLA (Invisible en PDF) */}
      <div className="page__header cluster no-print" style={{ justifyContent: 'space-between' }}>
        <div className="stack-2">
          <h1>Mis Prescripciones</h1>
          <p className="helper-text">Consulta tus medicamentos activos e historial de tratamientos.</p>
        </div>
        <button className="button button--ghost" onClick={() => window.print()} type="button">
          <Printer size={18} />
          <span className="hide-mobile">Imprimir Recetario</span>
        </button>
      </div>

      {prescriptions.length === 0 ? (
        <Card hoverable={false} className="no-print">
          <CardBody>
            <EmptyState
              icon={Pill}
              title="Sin prescripciones registradas"
              message="Tus recetas aparecerán aquí cuando tu médico registre nuevas indicaciones."
            />
          </CardBody>
        </Card>
      ) : (
        <div className="stack-6">
          {/* SECCIÓN: ACTIVAS */}
          {activePrescriptions.length > 0 && (
            <div className="stack-3 print-section">
              <h2 className="cluster no-print"><Activity size={20} color="var(--success)" /> Recetas Activas</h2>
              <div className="stack-3">
                {activePrescriptions.map((p) => (
                  <Card key={p.id} className="print-card border-accent">
                    <CardHeader className="cluster-print" style={{ justifyContent: "space-between" }}>
                      <div className="stack-1">
                        <strong className="print-main-text text-lg">
                          {p.substance} {p.form ? `- ${p.form}` : ""}
                        </strong>
                        <span className="helper-text print-sub-text">
                          Indicado el {formatDateISOToHuman(p.createdAt)}
                        </span>
                      </div>
                      <Badge variant="success" className="no-print">Activa</Badge>
                    </CardHeader>
                    <CardBody className="stack-3 print-body">
                      <div className="grid-2 print-grid">
                        <div className="data-item">
                          <span className="label-text no-print">Dosis:</span>
                          <p className="print-info"><strong>Dosis:</strong> {p.dose || "Según indicación"}</p>
                        </div>
                        <div className="data-item">
                          <span className="label-text no-print">Frecuencia:</span>
                          <p className="print-info"><strong>Frecuencia:</strong> {p.frequency || "N/A"}</p>
                        </div>
                        <div className="data-item">
                          <span className="label-text no-print">Duración:</span>
                          <p className="print-info"><strong>Duración:</strong> {p.duration || "N/A"}</p>
                        </div>
                      </div>
                      {p.notes && (
                        <div className="print-notes-box" style={{ marginTop: '1rem' }}>
                          <p className="text-main"><strong>Indicaciones adicionales:</strong></p>
                          <p className="helper-text print-notes-text">{p.notes}</p>
                        </div>
                      )}
                      <div className="no-print" style={{ marginTop: '1rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                        <p className="small text-muted">Prescrito por: {p.professional?.name || "Especialista"}</p>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* SECCIÓN: HISTORIAL */}
          {inactivePrescriptions.length > 0 && (
            <div className="stack-3 print-section">
              <h2 className="helper-text print-title-past">Historial de Tratamientos</h2>
              <div className="stack-2">
                {inactivePrescriptions.map((p) => (
                  <Card key={p.id} hoverable={false} className="card--sm print-card-mini">
                    <CardBody className="cluster-print" style={{ justifyContent: "space-between" }}>
                      <div className="cluster gap-4">
                        <FileText size={16} className="no-print" />
                        <div className="stack-0">
                          <strong className="print-secondary-text">{p.substance}</strong>
                          <span className="helper-text small print-sub-text">Finalizada el {formatDateISOToHuman(p.updatedAt)}</span>
                        </div>
                      </div>
                      <Badge variant={p.suspended ? "warning" : "neutral"} size="sm">
                        {p.suspended ? "Suspendida" : "Completada"}
                      </Badge>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PIE DE PÁGINA: Solo en PDF */}
      <footer className="show-only-print" style={{ marginTop: '4rem', textAlign: 'center' }}>
        <p style={{ fontSize: '8pt', color: '#666' }}>
          Este documento es una representación digital de su receta médica. 
          Consulte a su médico antes de realizar cualquier cambio en su tratamiento.
        </p>
      </footer>
    </section>
  );
}