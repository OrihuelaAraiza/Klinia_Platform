import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { listNotes } from "../../services/notesService";
import { formatDateISOToHuman } from "../../utils/formatters";
import Card, { CardHeader, CardBody } from "../../components/UI/Card";
import Badge from "../../components/UI/Badge";
import { useToast } from "../../components/UI/Toast";
import { SkeletonTitle, SkeletonList } from "../../components/UI/Skeleton";
import EmptyState from "../../components/UI/EmptyState";
import { FileText, Printer, User, ClipboardList, Target, Lightbulb } from "lucide-react";
import "./pdf.css";

/**
 * Vista de Notas de Evolución para el Portal del Paciente.
 * Muestra resúmenes de consulta y planes de acción compartidos por el especialista.
 */
export default function PatientNotes() {
  const { user } = useOutletContext() ?? {};
  const toast = useToast();
  const patientId = user?.id;

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!patientId) return;

    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        // Llama al servicio que apunta a /notes/patient/:id
        const response = await listNotes(patientId);
        if (!alive) return;
        
        // Se valida la estructura de respuesta del backend
        const items = Array.isArray(response?.items) ? response.items : [];
        setNotes(items);
      } catch (err) {
        if (!alive) return;
        if (err.status !== 404) {
          setError("No pudimos cargar tus notas de evolución.");
          toast.error("Error de conexión con el servidor clínico.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [patientId, toast]);

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
      
      {/* CABECERA EXCLUSIVA PARA IMPRESIÓN (PDF) */}
      <div className="show-only-print">
        <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '1rem', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '22pt', margin: 0 }}>RESUMEN DE NOTAS DE EVOLUCIÓN</h1>
          <p style={{ color: '#666' }}>Plataforma Clínica BreveMente</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <span><strong>Paciente:</strong> {user?.firstName} {user?.lastName}</span>
          <span><strong>Fecha de Reporte:</strong> {new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* HEADER DE PANTALLA (Se oculta al imprimir) */}
      <div className="page__header cluster no-print" style={{ justifyContent: 'space-between' }}>
        <div className="stack-2">
          <h1>Mis Notas de Evolución</h1>
          <p className="helper-text">Consulta los resúmenes de tus sesiones y planes de seguimiento.</p>
        </div>
        <button className="button button--ghost" onClick={() => window.print()} type="button">
          <Printer size={18} />
          <span className="hide-mobile">Imprimir Notas</span>
        </button>
      </div>

      {error ? (
        <Card hoverable={false} className="no-print">
          <CardBody>
            <p className="form-error" role="alert">{error}</p>
          </CardBody>
        </Card>
      ) : notes.length === 0 ? (
        <Card hoverable={false} className="no-print">
          <CardBody>
            <EmptyState
              icon={FileText}
              title="No hay notas disponibles"
              message="Aquí aparecerán los resúmenes de tus consultas una vez que tu especialista las finalice."
            />
          </CardBody>
        </Card>
      ) : (
        <div className="stack-5">
          {notes.map((note) => (
            <Card key={note.id} className="print-card">
              <CardHeader className="cluster-print" style={{ justifyContent: "space-between" }}>
                <div className="stack-1">
                  <strong className="print-main-text text-lg">
                    {/* AJUSTE: Usamos createdAt ya que datetime no existe en el esquema */}
                    {formatDateISOToHuman(note.createdAt)}
                  </strong>
                  <div className="cluster gap-1 helper-text print-sub-text">
                    <User size={14} className="no-print" />
                    <span>Especialista: {note.professional?.name || "No asignado"}</span>
                  </div>
                </div>
                <Badge variant="success" className="no-print">Finalizada</Badge>
              </CardHeader>
              
              <CardBody className="stack-4 print-body">
                {/* OBJETIVO */}
                {note.subjective && (
                  <div className="stack-1 print-section">
                    <div className="cluster gap-1 print-info-title">
                      <Target size={16} className="no-print" color="var(--primary)" />
                      <strong>Resumen de sesión:</strong>
                    </div>
                    <p className="print-info-text">{note.subjective}</p>
                  </div>
                )}

                {/* RECOMENDACIONES (Si usas el campo 'plan' o similar según tu esquema) */}
                {note.plan && (
                  <div className="stack-1 print-section border-top-print">
                    <div className="cluster gap-1 print-info-title">
                      <Lightbulb size={16} className="no-print" color="var(--warning)" />
                      <strong>Plan y Recomendaciones:</strong>
                    </div>
                    <p className="print-info-text">{note.plan}</p>
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* PIE DE PÁGINA: Solo en PDF */}
      <footer className="show-only-print" style={{ marginTop: '4rem', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
        <p style={{ fontSize: '8pt', color: '#999' }}>
          Este documento es un resumen informativo. La información clínica técnica completa reside en el expediente institucional del profesional de salud.
        </p>
      </footer>
    </section>
  );
}