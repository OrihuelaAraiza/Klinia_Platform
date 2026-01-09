import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { getClinicalHistory } from "../../services/clinicalHistoryService";
import { listMyTherapists } from "../../services/patientsService";
import Card, { CardHeader, CardBody } from "../../components/UI/Card";
import { useToast } from "../../components/UI/Toast";
import "./pdf.css"
import { 
  SkeletonTitle, 
  SkeletonSubtitle, 
  SkeletonList, 
  SkeletonCard, 
  SkeletonLine 
} from "../../components/UI/Skeleton";
import EmptyState from "../../components/UI/EmptyState";
import { 
  Clock, 
  User, 
  Activity, 
  ShieldAlert, 
  ClipboardList, 
  Pill, 
  Users,
  Printer
} from "lucide-react";

export default function PatientClinicalHistory() {
  const { user } = useOutletContext() ?? {};
  const toast = useToast();
  
  const [therapists, setTherapists] = useState([]);
  const [selectedTherapistId, setSelectedTherapistId] = useState("");
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 1. Cargar la lista de terapeutas al montar el componente
  useEffect(() => {
    if (!user?.id) return;

    async function loadTherapists() {
      try {
        const list = await listMyTherapists();
        setTherapists(list || []);
        // Seleccionamos el primero si existe para disparar el segundo useEffect
        if (list?.length > 0) {
          setSelectedTherapistId(list[0].id);
        }
      } catch (err) {
        toast.error("No pudimos cargar la lista de tus especialistas.");
      } finally {
        setLoading(false);
      }
    }
    loadTherapists();
  }, [user?.id, toast]);

  // 2. Cargar la historia clínica cada vez que cambie el terapeuta seleccionado
  useEffect(() => {
    // Verificación estricta para evitar enviar "undefined"
    if (!selectedTherapistId || !user?.id) {
      setHistory(null);
      return;
    }

    let alive = true;

    async function loadHistory() {
      setHistoryLoading(true);
      try {
        // Forzamos el envío del professionalId en el objeto de opciones
        const response = await getClinicalHistory(user.id, { 
          params: { professionalId: selectedTherapistId } 
        });
        
        if (alive) {
          setHistory(response);
        }
      } catch (err) {
        if (alive) {
          setHistory(null);
          // Si es 404, el médico aún no crea la historia; otros errores sí se notifican
          if (err.status !== 404) {
            toast.error("Error al obtener la información clínica.");
          }
        }
      } finally {
        if (alive) {
          setHistoryLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      alive = false;
    };
  }, [selectedTherapistId, user?.id, toast]);

  const handlePrint = () => {
    window.print();
  };

  // Renderizado de estado de carga inicial
  if (loading) {
    return (
      <section className="page stack-5">
        <SkeletonTitle />
        <SkeletonSubtitle />
        <SkeletonList count={3} />
      </section>
    );
  }

  // Renderizado si no hay terapeutas vinculados
  if (therapists.length === 0) {
    return (
      <section className="page stack-5">
        <div className="page__header">
            <h1>Mi Historia Clínica</h1>
        </div>
        <Card hoverable={false}>
          <CardBody>
            <EmptyState
              icon={User}
              title="Aún no tienes especialistas asignados"
              message="Tu expediente aparecerá aquí cuando un profesional de salud te vincule a su sistema."
            />
          </CardBody>
        </Card>
      </section>
    );
  }

  const currentTherapist = therapists.find(t => t.id === selectedTherapistId);

  return (
    <section className="page stack-5">
    {/* CABECERA EXCLUSIVA PARA EL PDF/IMPRESIÓN */}
    <div className="print-header">
        <h1>Mi Historia Clínica</h1>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
        <p><strong>Paciente:</strong> {user?.name || "Angel David Morales Cuenca"}</p>
        <p><strong>Fecha:</strong> {new Date().toLocaleDateString()}</p>
      </div>
      <p><strong>Especialista:</strong> {currentTherapist?.name || "Especialista Psiquiatra"}</p>
    </div>

    {/* HEADER DE PANTALLA (Se ocultará al imprimir gracias a .no-print) */}
    <div className="page__header cluster no-print">
      <div className="stack-2">
      
        <p className="helper-text">Consulta la información registrada por tus especialistas.</p>
      </div>
      <div className="cluster gap-2">
        <button className="button button--ghost" onClick={() => window.print()}>
          <Printer size={18} /> Imprimir Expediente
        </button>
        <select 
          className="select" 
          value={selectedTherapistId} 
          onChange={(e) => setSelectedTherapistId(e.target.value)}
        >
          {therapists.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
    </div>

    {/* CONTENIDO CLÍNICO (Se imprimirá limpio) */}
    <div className="stack-4">
      <Card>
        <CardHeader><h2>Resumen Clínico</h2></CardHeader>
        <CardBody>
          <p>{history?.motive || "No hay motivo registrado"}</p>
        </CardBody>
      </Card>

      {historyLoading ? (
        <div className="stack-4">
          <SkeletonCard>
            <div className="stack-2">
              <SkeletonLine width="30%" />
              <SkeletonLine width="100%" />
            </div>
          </SkeletonCard>
          <SkeletonList count={2} />
        </div>
      ) : !history ? (
        <Card hoverable={false}>
          <CardBody>
            <EmptyState
              icon={Clock}
              title="Historia no iniciada"
              message={`El profesional ${currentTherapist?.name || ''} todavía no ha registrado datos clínicos en tu expediente.`}
            />
          </CardBody>
        </Card>
      ) : (
        <div className="stack-4 no-print-gap">
          
          {/* SECCIÓN 1: MOTIVO Y DIAGNÓSTICOS */}
          <Card hoverable={false}>
            <CardHeader className="cluster">
              <ClipboardList size={20} />
              <h2>Resumen de Consulta</h2>
            </CardHeader>
            <CardBody className="stack-3">
              <div className="data-item">
                <span className="label-text">Motivo de atención:</span>
                <p className="text-main">{history.motive || "No especificado"}</p>
              </div>
              
              {history.diagnoses?.length > 0 && (
                <div className="data-item">
                  <span className="label-text">Diagnósticos:</span>
                  <div className="cluster gap-1" style={{ marginTop: '0.5rem' }}>
                    {history.diagnoses.map((d, i) => (
                      <span key={i} className="badge badge--primary">
                        {d.label || d.code}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* SECCIÓN 2: ALERTAS Y HÁBITOS */}
          <div className="grid-2">
            <Card hoverable={false}>
              <CardHeader className="cluster">
                <ShieldAlert size={20} color="var(--error)" />
                <h2>Alertas Médicas</h2>
              </CardHeader>
              <CardBody className="stack-3">
                <div className="data-item">
                  <span className="label-text">Alergias:</span>
                  <p>{history.hasAllergies ? " Alergias detectadas" : "Sin alergias conocidas"}</p>
                </div>
                <div className="data-item">
                  <span className="label-text">Medicamentos actuales:</span>
                  {history.currentMedications?.length > 0 ? (
                    <ul className="list-style-none">
                      {history.currentMedications.map((m, i) => (
                        <li key={i} className="cluster gap-1">
                          <Pill size={14} /> {m.name || m.substance} {m.dose && `(${m.dose})`}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="helper-text">Ninguno reportado</p>}
                </div>
              </CardBody>
            </Card>

            <Card hoverable={false}>
              <CardHeader className="cluster">
                <Activity size={20} />
                <h2>Estilo de Vida</h2>
              </CardHeader>
              <CardBody className="stack-3">
                <div className="data-item">
                  <span className="label-text">Actividad física:</span>
                  <p>{history.physicalActivity || "No registrada"}</p>
                </div>
                <div className="data-item">
                  <span className="label-text">Patrones de sueño:</span>
                  <p>{history.sleepPatterns || "No registrados"}</p>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* SECCIÓN 3: ANTECEDENTES FAMILIARES */}
          {history.familyBackground?.length > 0 && (
            <Card hoverable={false}>
              <CardHeader className="cluster">
                <Users size={20} />
                <h2>Antecedentes Familiares</h2>
              </CardHeader>
              <CardBody>
                <div className="stack-2">
                  {history.familyBackground.map((f, i) => (
                    <div key={i} className="cluster" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                      <span className="text-bold">{f.relative || "Familiar"}</span>
                      <span className="helper-text">{f.condition || "Sin detalle"}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* SECCIÓN 4: PLAN TERAPÉUTICO */}
          <Card hoverable={false}>
            <CardHeader><h2>Plan de Trabajo</h2></CardHeader>
            <CardBody className="stack-3">
              <div className="data-item">
                <span className="label-text">Objetivos terapéuticos:</span>
                <p>{history.goals || "Pendiente de definición"}</p>
              </div>
              <div className="data-item">
                <span className="label-text">Tratamiento sugerido:</span>
                <p>{history.therapeuticPlan || "En elaboración"}</p>
              </div>
            </CardBody>
          </Card>

          <footer className="helper-text align-center" style={{ padding: 'var(--s2)' }}>
            Actualizado por el especialista {currentTherapist?.name} el {new Date(history.updatedAt).toLocaleDateString('es-MX', { 
              day: 'numeric', month: 'long', year: 'numeric' 
            })}.
          </footer>
        </div>
      )}
    </div>
    </section>
  );
}